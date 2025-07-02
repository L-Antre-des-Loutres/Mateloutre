import {
  Events,
  ChannelType,
  PermissionFlagsBits,
  Colors,
  Client,
  Guild,
  TextChannel,
  EmbedBuilder,
  ColorResolvable
} from "discord.js";
import * as fs from "fs";
import * as path from "path";
import { BotEvent } from "../types";
import otterlogs from "../utils/otterlogs";
import {fetchPokeNews} from "../scraper/pokeNewsScraper";

const CACHE_FILE = path.join(__dirname, '../../pokekalos-latest-news.cache');

const event: BotEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    otterlogs.success(`Ready! Logged in as ${client.user?.tag}`);
    client.user?.setActivity("Who's that Pokémon?!");

    // Noms des salons à créer pour le fonctionnement de mineotter
    const channelNames: string[] = [
      "🦦・logs-mateloutre",
      "❌・logs-erreur"
    ];

    // ID du serveur
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
      otterlogs.error("GuildId non trouvée");
      return;
    }

    // Nom de la catégorie
    const categoryName = process.env.CATEGORY_NAME;
    if (!categoryName) {
      otterlogs.error("CategoryName non trouvée");
      return;
    }

    // Nom du rôle
    const roleName = process.env.ROLE_NAME;
    if (!roleName) {
      otterlogs.error("RoleName non trouvée");
      return;
    }

    // Tableau pour stocker les noms des salons existants
    const channelsDiscord: string[] = [];

    try {
      // Récupère la guild
      const guild: Guild | undefined = client.guilds.cache.get(guildId);
      if (!guild) {
        otterlogs.error("Guild non trouvée");
        return;
      }

      // Récupère la liste des salons et stocke les noms dans un tableau
      guild.channels.cache.forEach((channel) => {
        channelsDiscord.push(channel.name);
      });

      // Vérifie si le rôle existe déjà
      let role = guild.roles.cache.find((r) => r.name === roleName);
      if (!role) {
        // Crée un rôle spécifique
        role = await guild.roles.create({
          name: roleName,
          color: Colors.Blue,
          reason: "Role spécifique pour la catégorie",
        });
        otterlogs.success(`Rôle "${roleName}" créé !`);
      } else {
        otterlogs.log(`Le rôle "${roleName}" existe déjà`);
      }

      // Vérifie si la catégorie existe déjà
      let category = guild.channels.cache.find(
        (channel) =>
          channel.name === categoryName &&
          channel.type === ChannelType.GuildCategory
      );

      if (category) {
        otterlogs.log(`La catégorie "${categoryName}" existe déjà`);
      } else {
        // Crée une catégorie avec les permissions pour le rôle spécifique
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.id, // ID du serveur
              deny: [PermissionFlagsBits.ViewChannel], // Interdire la vue des salons à tout le monde par défaut
            },
            {
              id: role.id, // ID du rôle spécifique
              allow: [PermissionFlagsBits.ViewChannel], // Autoriser la vue des salons pour le rôle spécifique
            },
          ],
        });
        otterlogs.success(`Catégorie "${categoryName}" créée avec les permissions !`);
      }

      // Crée des salons à l'intérieur de la catégorie avec les mêmes permissions
      for (const channelName of channelNames) {
        if (channelsDiscord.includes(channelName)) {
          otterlogs.log(`Le salon "${channelName}" existe déjà`);
        } else {
          await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
              {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: role.id,
                allow: [PermissionFlagsBits.ViewChannel],
              },
            ],
          });
          otterlogs.success(`Salon "${channelName}" créé !`);
        }
      }
    } catch (error) {
      otterlogs.error(`Erreur lors de la création de la catégorie, des salons et du rôle : ${error}`);
    }

    // Appel immédiat au démarrage
    await (async () => {
      try {
        await scrape();
      } catch (err) {
        console.error("❌ Erreur initiale du scraping :", err);
      }
    })();

    setInterval(async () => {
      await scrape();
    }, 1000 * 60 * 30); // toutes les 30 minutes

    // Fonction de scraping
    async function scrape() {
      otterlogs.log("Lancement du scraping des actus de Pokekalos.");
      try {
        const news = await fetchPokeNews();

        // Supposons que news[0] est un objet Cheerio ou contient un champ 'html'
        console.log(news); // ou console.log(news[0].html) selon structure

        if (!news.length) return;

        const latest = news[0];
        const lastTitle = fs.existsSync(CACHE_FILE) ? fs.readFileSync(CACHE_FILE, 'utf-8') : '';

        if (latest.title !== lastTitle) {
          fs.writeFileSync(CACHE_FILE, latest.title);

          const message = `🗒️ Une nouvelle actualité Pokémon est en ligne sur Pokékalos.`;
          const embed : EmbedBuilder = new EmbedBuilder()
          .setTitle(latest.title).setURL(latest.link)
              .setDescription(`${latest.description}\n🔗 [Lire l'article](${latest.link})`)
              .setImage(latest.image)
              .setColor(process.env.BOT_COLOR as ColorResolvable)
              .setFields(
                  {name: 'Source', value: 'Pokekalos', inline: true},
                  {name: 'Date', value: latest.date, inline: true}
              )
              .setFooter({
                text: "Mineotter",
                iconURL: client.user?.displayAvatarURL() || '',
              })
          .setTimestamp();
          const channel = client.channels.cache.get(process.env.NEWS_CHANNEL_ID) as TextChannel;
          await channel.send({content: message, embeds: [embed]});
          console.log(`✅ Nouvelle actu envoyée : ${latest.title}`);
        } else {
          console.log('✅ Aucune nouvelle actu.');
        }
      } catch (error) {
        console.error("Erreur lors du scraping :", error);
      }
    }
  }
};

export default event;
