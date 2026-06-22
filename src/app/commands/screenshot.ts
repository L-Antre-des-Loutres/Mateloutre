import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { otterlogs } from "../../otterbots/utils/otterlogs";
import {
    DEFAULT_EMBED_COLOR,
} from "../utils/serverHelper";
import {
    buildPlatformChoices,
    buildRefuseCustomId,
    buildValidateCustomId,
    fetchAllPlatforms,
    findPlatformById,
    PENDING_COLOR,
    PENDING_EMOJI,
} from "../utils/screenshotHelper";

const STRINGS = {
    command: {
        name: "screenshot",
        description: "Proposer un screenshot de jeu pour le site antredesloutres.fr.",
    },
    options: {
        plateforme: { name: "plateforme", description: "La plateforme de jeu (Pokémon par défaut)" },
        image: { name: "image", description: "Ton screenshot (image)" },
        titre: { name: "titre", description: "Un titre ou une description (optionnel)" },
    },
    replies: {
        guildOnly: "Cette commande s'utilise sur le serveur, pas en message privé.",
        notImage: "Le fichier fourni n'est pas une image.",
        platformNotFound: "Plateforme introuvable.",
        noModChannel: "Le salon de modération est introuvable. Contacte un administrateur.",
        submitChannelUnavailable: "Impossible de publier le screenshot dans ce salon.",
        success: "Ton screenshot a été soumis ! Il sera ajouté à la galerie une fois validé par un modérateur. ⏳",
    },
    submission: {
        title: (titre: string) => titre || "Capture d'écran",
        pendingFooter: `${PENDING_EMOJI} En attente de validation`,
    },
    moderation: {
        title: "Lien vers la demande de screenshot à valider",
        fieldPlayer: "Joueur",
        fieldTitle: "Titre",
        validateLabel: "Valider",
        refuseLabel: "Refuser",
    },
    fieldPlatform: "Plateforme",
} as const;

export default {
    data: new SlashCommandBuilder()
        .setName(STRINGS.command.name)
        .setDescription(STRINGS.command.description)
        .addAttachmentOption(option =>
            option.setName(STRINGS.options.image.name)
                .setDescription(STRINGS.options.image.description)
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName(STRINGS.options.plateforme.name)
                .setDescription(STRINGS.options.plateforme.description)
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName(STRINGS.options.titre.name)
                .setDescription(STRINGS.options.titre.description)
                .setRequired(false)
        ),

    async autocomplete(interaction: AutocompleteInteraction) {
        const focused = interaction.options.getFocused(true);
        otterlogs.debug(`screenshot autocomplete: focused="${focused.name}" value="${focused.value}"`);

        if (focused.name === STRINGS.options.plateforme.name) {
            const platforms = await fetchAllPlatforms();
            const choices = buildPlatformChoices(platforms, focused.value);
            otterlogs.debug(`screenshot autocomplete: ${choices.length} platform choices`);
            await interaction.respond(choices);
            return;
        }

        otterlogs.warn(`screenshot autocomplete: unhandled option "${focused.name}"`);
        await interaction.respond([]);
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: STRINGS.replies.guildOnly, flags: MessageFlags.Ephemeral });
            return;
        }

        const platformId = interaction.options.getString(STRINGS.options.plateforme.name);
        const image = interaction.options.getAttachment(STRINGS.options.image.name, true);
        const titre = interaction.options.getString(STRINGS.options.titre.name) ?? "";

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!image.contentType?.startsWith("image/")) {
            await interaction.editReply(STRINGS.replies.notImage);
            return;
        }

        let platform;
        if (platformId) {
            platform = await findPlatformById(platformId);
        } else {
            const platforms = await fetchAllPlatforms();
            platform = platforms.find(p => 
                p.name.toLowerCase() === "pokémon" || 
                p.name.toLowerCase() === "pokemon"
            );
        }

        if (!platform) {
            await interaction.editReply(STRINGS.replies.platformNotFound);
            return;
        }

        const modChannelId = process.env.MODERATION_CHANNEL_ID;
        if (!modChannelId) {
            await interaction.editReply(STRINGS.replies.noModChannel);
            return;
        }

        const modChannel = await interaction.client.channels.fetch(modChannelId).catch(() => null);
        if (!modChannel || !modChannel.isTextBased()) {
            await interaction.editReply(STRINGS.replies.noModChannel);
            return;
        }

        const publicChannel = interaction.channel;
        if (!publicChannel || !publicChannel.isTextBased()) {
            await interaction.editReply(STRINGS.replies.submitChannelUnavailable);
            return;
        }

        const submissionEmbed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTitle(STRINGS.submission.title(titre))
            .addFields(
                { name: STRINGS.fieldPlatform, value: platform.name, inline: true },
            )
            .setImage(image.url)
            .setColor(DEFAULT_EMBED_COLOR)
            .setFooter({ text: STRINGS.submission.pendingFooter })
            .setTimestamp();

        const submissionMessage = await (publicChannel as TextChannel).send({ embeds: [submissionEmbed] });
        await submissionMessage.react(PENDING_EMOJI).catch(() => undefined);

        const moderationEmbed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTitle(STRINGS.moderation.title)
            .setURL(submissionMessage.url)
            .addFields(
                { name: STRINGS.moderation.fieldPlayer, value: `<@${interaction.user.id}>`, inline: true },
                { name: STRINGS.fieldPlatform, value: platform.name, inline: true },
            )
            .setImage(image.url)
            .setColor(PENDING_COLOR)
            .setTimestamp();

        if (titre) {
            moderationEmbed.addFields({ name: STRINGS.moderation.fieldTitle, value: titre });
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(buildValidateCustomId(platform.id, interaction.user.id))
                .setLabel(STRINGS.moderation.validateLabel)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(buildRefuseCustomId())
                .setLabel(STRINGS.moderation.refuseLabel)
                .setStyle(ButtonStyle.Danger),
        );

        await (modChannel as TextChannel).send({ embeds: [moderationEmbed], components: [row] });

        otterlogs.debug(`screenshot submitted by ${interaction.user.tag} for platform=${platform.name}`);

        await interaction.editReply(STRINGS.replies.success);
    },
};

