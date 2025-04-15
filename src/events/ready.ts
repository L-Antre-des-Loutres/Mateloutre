import { Events, ChannelType, PermissionFlagsBits, Colors, Client, Guild } from "discord.js";
import * as fs from "fs";
import { BotEvent } from "../types";
import otterlogs from "../utils/otterlogs";

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
  }
};

export default event;
