import { Events, Message } from "discord.js";
import otterlogs from "../utils/otterlogs";

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot) return; // Ignore les messages des bots

    const messageContent = message.content.toLowerCase();
    if (messageContent.includes("mateloutre")) {
      message.react("🌊");
    }
  },
};