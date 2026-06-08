import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Client,
    ButtonInteraction,
    EmbedBuilder,
} from "discord.js";
import {otterlogs} from "../utils/otterlogs";
import {SlashCommand} from "../types";
import {
    parseCustomId,
    parseMessageRef,
    updateSubmissionStatus,
    createScreenshotRecord,
    findDiscordUserRecordId,
    VALIDATED_EMOJI,
    REFUSED_EMOJI,
    VALIDATED_COLOR,
    REFUSED_COLOR,
} from "../../app/utils/screenshotHelper";

/**
 * Handles interaction events for chat input commands and executes the appropriate command logic.
 *
 * @param {Client} client - The Discord.js client instance used to handle events and manage interactions.
 * @return {void} This function does not return a value; it sets up events listeners for the client.
 */
export async function otterBots_interactionCreate(client: Client): Promise<void> {
    client.on("interactionCreate", async (interaction) => {

        if (interaction.isButton()) {
            const parsed = parseCustomId(interaction.customId);
            if (!parsed) return; // Not a screenshot moderation button

            const buttonInteraction = interaction as ButtonInteraction;
            await buttonInteraction.deferReply({ ephemeral: true });

            const messageRef = parseMessageRef(buttonInteraction.message.embeds[0]?.url);
            if (!messageRef) {
                await buttonInteraction.editReply("Impossible de retrouver le message original.");
                return;
            }

            try {
                if (parsed.action === "validate") {
                    const discordUserRecordId = await findDiscordUserRecordId(parsed.authorId);
                    const embed = buttonInteraction.message.embeds[0];
                    const imageUrl = embed.image?.url;
                    
                    let title = embed.fields.find(f => f.name === "Titre")?.value || embed.title || "Screenshot";
                    if (title === "Lien vers la demande de screenshot à valider") title = "Screenshot";

                    if (!imageUrl) {
                        await buttonInteraction.editReply("L'image est introuvable.");
                        return;
                    }

                    await createScreenshotRecord({
                        name: title,
                        platformId: parsed.platformId,
                        discordUserRecordId,
                        imageUrl,
                    });

                    await updateSubmissionStatus(client, messageRef, VALIDATED_EMOJI, `${VALIDATED_EMOJI} Validé par ${buttonInteraction.user.tag}`);
                    
                    const modEmbed = EmbedBuilder.from(embed)
                        .setColor(VALIDATED_COLOR)
                        .addFields({ name: "Statut", value: `${VALIDATED_EMOJI} Validée par <@${buttonInteraction.user.id}>` });
                    await buttonInteraction.message.edit({ embeds: [modEmbed], components: [] });
                    
                    await buttonInteraction.editReply("Le screenshot a été validé et ajouté à la base de données.");
                    otterlogs.log(`Screenshot validated by ${buttonInteraction.user.tag}`);
                } else if (parsed.action === "refuse") {
                    await updateSubmissionStatus(client, messageRef, REFUSED_EMOJI, `${REFUSED_EMOJI} Refusé par ${buttonInteraction.user.tag}`);
                    
                    const modEmbed = EmbedBuilder.from(buttonInteraction.message.embeds[0])
                        .setColor(REFUSED_COLOR)
                        .addFields({ name: "Statut", value: `${REFUSED_EMOJI} Refusée par <@${buttonInteraction.user.id}>` });
                    await buttonInteraction.message.edit({ embeds: [modEmbed], components: [] });
                    
                    await buttonInteraction.editReply("Le screenshot a été refusé.");
                    otterlogs.log(`Screenshot refused by ${buttonInteraction.user.tag}`);
                }
            } catch (error) {
                otterlogs.error(`Error processing screenshot button interaction: ${error}`);
                await buttonInteraction.editReply("Une erreur est survenue lors du traitement de l'action.");
            }
            return;
        }

        if (interaction.isAutocomplete()) {
            const command: SlashCommand | undefined = client.slashCommands.get(interaction.commandName);
            if (!command || typeof command.autocomplete !== "function") {
                otterlogs.warn(`No autocomplete handler for ${interaction.commandName}`);
                return;
            }

            try {
                await (command.autocomplete as (i: AutocompleteInteraction) => Promise<unknown>)(interaction as AutocompleteInteraction);
            } catch (error) {
                otterlogs.error(`Error during autocomplete for ${interaction.commandName}: ${error}`);
                try {
                    await interaction.respond([
                        { name: "⚠️ Erreur lors de l’autocomplétion", value: "error" },
                    ]);
                } catch {}
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command: SlashCommand | undefined = client.slashCommands.get(interaction.commandName);
        if (!command) {
            otterlogs.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction as ChatInputCommandInteraction);
        } catch (error) {
            otterlogs.error(`Error executing command ${interaction.commandName}: ${error}`);

            const replyMessage = interaction.replied || interaction.deferred
                ? '🦦 Oups! Une loutre a fait tomber le serveur dans l’eau! La commande n’a pas pu être exécutée.'
                : '🦦 La loutre responsable de cette commande est partie faire la sieste! Réessayez plus tard.';

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: replyMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: replyMessage, ephemeral: true });
            }
        }
    });
}
