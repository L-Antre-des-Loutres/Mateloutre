import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    AutocompleteInteraction,
    ColorResolvable,
    AttachmentBuilder,
    GuildMember,
    TextBasedChannel,
    Message,
    MessagePayload,
    MessageCreateOptions,
    MessageFlags,
} from "discord.js";
import { SlashCommand } from "../../otterbots/types";
import { generatePokedleImage } from "../utils/pokedle/imageGenerator";
import { OtterCache } from "../../otterbots/utils/ottercache/ottercache";
import { POKEDLE_CONSTANTS } from "../utils/pokedle/constants";
import { PapiService } from "../utils/papi/papiService";
import { PokemonData } from "../utils/pokedle/gameLogic";
import { PokedleStatsService } from "../utils/pokedle/mateloutreDleStats";

export interface PokedleSession {
    attemptsIds: number[];
    messageId?: string;
    channelId?: string;
}

type SendableChannel = TextBasedChannel & { send(options: string | MessagePayload | MessageCreateOptions): Promise<Message> };

const pokedleCache = new OtterCache<PokedleSession | number[]>(POKEDLE_CONSTANTS.CACHE_FILE_NAME);

export default {
    name: POKEDLE_CONSTANTS.COMMAND_NAME,
    data: new SlashCommandBuilder()
        .setName(POKEDLE_CONSTANTS.COMMAND_NAME)
        .setDescription(POKEDLE_CONSTANTS.COMMAND_DESCRIPTION)
        .addSubcommand(sub =>
            sub.setName(POKEDLE_CONSTANTS.SUBCOMMAND_GUESS_NAME)
                .setDescription(POKEDLE_CONSTANTS.SUBCOMMAND_GUESS_DESCRIPTION)
                .addStringOption(opt =>
                    opt.setName(POKEDLE_CONSTANTS.OPTION_POKEMON_NAME)
                        .setDescription(POKEDLE_CONSTANTS.OPTION_POKEMON_DESCRIPTION)
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName(POKEDLE_CONSTANTS.SUBCOMMAND_VIEW_NAME)
                .setDescription(POKEDLE_CONSTANTS.SUBCOMMAND_VIEW_DESCRIPTION)
        )
        .addSubcommand(sub =>
            sub.setName(POKEDLE_CONSTANTS.SUBCOMMAND_STATS_NAME)
                .setDescription(POKEDLE_CONSTANTS.SUBCOMMAND_STATS_DESCRIPTION)
        ) as SlashCommandBuilder,

    async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const pokemonList = await PapiService.getAllPokemonForPokedle();
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        let choices: PokemonData[];
        if (focusedValue === "") {
            // Ordre du Pokédex par défaut (déjà trié par ID dans PapiService)
            choices = pokemonList.slice(0, 25);
        } else {
            // Tri par pertinence/lettre quand on commence à taper
            choices = pokemonList
                .filter(p => p.name.toLowerCase().includes(focusedValue))
                .sort((a, b) => {
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    const aStarts = aName.startsWith(focusedValue);
                    const bStarts = bName.startsWith(focusedValue);
                    
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    
                    // Si les deux commencent pareil ou ne commencent pas par la lettre, tri alphabétique
                    return aName.localeCompare(bName);
                })
                .slice(0, 25);
        }
        
        await interaction.respond(
            choices.map(p => ({ name: p.name, value: p.name }))
        );
    },

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const now = new Date();
        
        // Utilisation de la date locale (YYYY-MM-DD) pour un reset à minuit heure locale du serveur
        const todayISO = now.toLocaleDateString('en-CA'); 
        const todayFR = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const cacheKey = `${userId}_${todayISO}`;

        // Récupération ou initialisation de la session (gestion rétrocompatibilité de l'ancien cache)
        const sessionRaw = pokedleCache.get(cacheKey);
        let session: PokedleSession = { attemptsIds: [] };
        if (sessionRaw) {
            if (Array.isArray(sessionRaw)) {
                session.attemptsIds = sessionRaw;
            } else {
                session = sessionRaw as PokedleSession;
            }
        }

        const attemptsIds = session.attemptsIds;
        const isFirstGuess = attemptsIds.length === 0 && subcommand === POKEDLE_CONSTANTS.SUBCOMMAND_GUESS_NAME;

        // Le premier essai est un message public. Les essais suivants ou la vue sont éphémères.
        await interaction.deferReply({ flags: !isFirstGuess ? MessageFlags.Ephemeral : undefined });

        const pokemonList = await PapiService.getAllPokemonForPokedle();
        if (pokemonList.length === 0) {
            await interaction.editReply({ content: "Désolé, impossible de charger les données des Pokémon pour le moment." });
            return;
        }

        // Algorithme de hachage plus robuste pour le Pokémon du jour (basé sur sdbm)
        // On inclut l'ID de l'utilisateur pour que chaque joueur ait un Pokémon différent
        const getDailyIndex = (seed: string, max: number) => {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = seed.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
            }
            return Math.abs(hash) % max;
        };

        const targetIndex = getDailyIndex(`${todayISO}_${userId}`, pokemonList.length);
        const targetPokemon = pokemonList[targetIndex];

        const displayName = interaction.member instanceof GuildMember 
            ? interaction.member.displayName 
            : interaction.user.displayName;

        if (subcommand === POKEDLE_CONSTANTS.SUBCOMMAND_GUESS_NAME) {
            const guessName = interaction.options.getString(POKEDLE_CONSTANTS.OPTION_POKEMON_NAME, true);
            const guessPokemon = pokemonList.find(p => p.name.toLowerCase() === guessName.toLowerCase());

            if (!guessPokemon) {
                await interaction.editReply({ content: POKEDLE_CONSTANTS.MSG_NOT_IN_LIST });
                return;
            }

            // Si déjà gagné, afficher le tableau de victoire et arrêter
            if (attemptsIds.includes(targetPokemon.id)) {
                const msgLink = session.messageId && session.channelId ? `\n[Voir ton Pokedle public](https://discord.com/channels/${interaction.guildId}/${session.channelId}/${session.messageId})` : "";
                await interaction.editReply({ content: POKEDLE_CONSTANTS.MSG_ALREADY_WON.replace("{target}", targetPokemon.name) + msgLink });
                return;
            }

            if (attemptsIds.includes(guessPokemon.id)) {
                await interaction.editReply({ content: POKEDLE_CONSTANTS.MSG_ALREADY_TRIED });
                return;
            }

            attemptsIds.push(guessPokemon.id);
            session.attemptsIds = attemptsIds;

            const isWin = guessPokemon.id === targetPokemon.id;
            
            // Génération de l'image
            const attemptsPokemon = attemptsIds.map(id => pokemonList.find(p => p.id === id)!);
            const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
            const imageBuffer = await generatePokedleImage(attemptsPokemon, targetPokemon, avatarUrl, displayName);
            const attachment = new AttachmentBuilder(imageBuffer, { name: POKEDLE_CONSTANTS.RESULT_IMAGE_NAME });

            const embed = new EmbedBuilder()
                .setTitle(POKEDLE_CONSTANTS.EMBED_TITLE.replace("{date}", todayFR))
                .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                .setImage(`attachment://${POKEDLE_CONSTANTS.RESULT_IMAGE_NAME}`)
                .setFooter({ 
                    text: isWin 
                        ? POKEDLE_CONSTANTS.FOOTER_WON_TEXT.replace("{count}", attemptsIds.length.toString())
                        : POKEDLE_CONSTANTS.FOOTER_TEXT.replace("{count}", attemptsIds.length.toString()) 
                });

            if (isWin) {
                embed.addFields({ 
                    name: POKEDLE_CONSTANTS.MSG_WIN_TITLE, 
                    value: POKEDLE_CONSTANTS.MSG_WIN_CONTENT
                        .replace("{target}", targetPokemon.name)
                        .replace("{attempts}", attemptsIds.length.toString()) 
                });
                // Enregistrement de la victoire dans PocketBase
                await PokedleStatsService.saveWin(userId, attemptsIds.length, targetPokemon.name);
            }

            if (isFirstGuess) {
                const msg = await interaction.editReply({ embeds: [embed], files: [attachment] });
                session.messageId = msg.id;
                session.channelId = msg.channelId;
                pokedleCache.set(cacheKey, session);
            } else {
                let edited = false;
                let msgLink = "";
                
                if (session.messageId && session.channelId) {
                    try {
                        const channel = await interaction.client.channels.fetch(session.channelId);
                        if (channel && channel.isTextBased() && 'messages' in channel) {
                            const msg = await channel.messages.fetch(session.messageId);
                            if (msg) {
                                await msg.edit({ embeds: [embed], files: [attachment] });
                                edited = true;
                                msgLink = `https://discord.com/channels/${interaction.guildId}/${session.channelId}/${session.messageId}`;
                            }
                        }
                    } catch (e) {
                        console.error("Impossible d'éditer le message Pokedle original", e);
                    }
                }

                pokedleCache.set(cacheKey, session);

                if (edited) {
                    if (isWin) {
                        await interaction.editReply({ content: `🎉 Bravo ! Ton [Pokedle public](${msgLink}) a été mis à jour avec ta victoire.` });
                        const channel = await interaction.client.channels.fetch(session.channelId!);
                        if (channel && channel.isTextBased() && 'send' in channel) {
                            await (channel as SendableChannel).send({ content: `GG <@${interaction.user.id}> ! Tu as trouvé le Pokémon du jour : **${targetPokemon.name}** en **${attemptsIds.length}** essais !` });
                        }
                    } else {
                        await interaction.editReply({ content: `Essai pris en compte ! Ton [Pokedle public](${msgLink}) a été mis à jour.` });
                    }
                } else {
                    await interaction.editReply({ content: "Voici ton Pokedle (le message original est introuvable) :", embeds: [embed], files: [attachment] });
                }
            }

        } else if (subcommand === POKEDLE_CONSTANTS.SUBCOMMAND_VIEW_NAME) {
            if (attemptsIds.length === 0) {
                await interaction.editReply({ content: "Tu n'as pas encore commencé ta partie d'aujourd'hui !" });
                return;
            }

            const attemptsPokemon = attemptsIds.map(id => pokemonList.find(p => p.id === id)!);
            const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
            const imageBuffer = await generatePokedleImage(attemptsPokemon, targetPokemon, avatarUrl, displayName);
            const attachment = new AttachmentBuilder(imageBuffer, { name: POKEDLE_CONSTANTS.RESULT_IMAGE_NAME });

            const isWon = attemptsIds.includes(targetPokemon.id);

            const embed = new EmbedBuilder()
                .setTitle(POKEDLE_CONSTANTS.EMBED_TITLE.replace("{date}", todayFR))
                .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                .setImage(`attachment://${POKEDLE_CONSTANTS.RESULT_IMAGE_NAME}`)
                .setFooter({ 
                    text: isWon 
                        ? POKEDLE_CONSTANTS.FOOTER_WON_TEXT.replace("{count}", attemptsIds.length.toString())
                        : POKEDLE_CONSTANTS.FOOTER_TEXT.replace("{count}", attemptsIds.length.toString()) 
                });

            if (isWon) {
                embed.setDescription(`Partie terminée ! Le Pokémon était **${targetPokemon.name}**.`);
            }

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } else if (subcommand === POKEDLE_CONSTANTS.SUBCOMMAND_STATS_NAME) {
            const stats = await PokedleStatsService.getStatsForUser(userId);

            if (stats.length === 0) {
                await interaction.editReply({ content: "Tu n'as encore aucune victoire enregistrée au Pokedle. Lance-toi avec `/pokedle guess` !" });
                return;
            }

            const totalWins    = stats.length;
            const bestTry      = Math.min(...stats.map(s => s.nb_try));
            const averageTries = (stats.reduce((acc, s) => acc + s.nb_try, 0) / totalWins).toFixed(1);
            const lastWin      = stats[0]; // déjà trié par -created
            const lastWinDate  = new Date(lastWin.created).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

            const embed = new EmbedBuilder()
                .setTitle(`📊 Stats Pokedle de ${displayName}`)
                .setColor((process.env.BOT_COLOR || "#FFFFFF") as ColorResolvable)
                .addFields(
                    { name: '🏆 Victoires totales',   value: `**${totalWins}**`,          inline: true },
                    { name: '⚡ Meilleur score',       value: `**${bestTry}** essai(s)`,   inline: true },
                    { name: '📈 Moyenne',              value: `**${averageTries}** essais`, inline: true },
                    { name: '🕐 Dernière victoire',    value: `**${lastWin.pokemon_name}** le ${lastWinDate} en **${lastWin.nb_try}** essai(s)`, inline: false },
                )
                .setFooter({ text: 'Seules les victoires sont comptabilisées.' });

            await interaction.editReply({ embeds: [embed] });
        }
    }
} as SlashCommand;

