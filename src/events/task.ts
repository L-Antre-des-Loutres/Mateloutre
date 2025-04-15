import { Events, Client} from "discord.js";
import { BotEvent } from "../types";
import otterlogs from "../utils/otterlogs";

const event: BotEvent = {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client): Promise<void> {
        otterlogs.log ("Initialisation des tâches périodiques.");
        
        // Lancement de la tâche périodique
        import("../task/task").then(task => {
            task.task(client, process.env.GUILD_ID);
        });
    }}

export default event;