const dotenv = require('dotenv');
dotenv.config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, WelcomeChannel, userMention, channelMention, codeBlock, GuildMember, inlineCode } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'Commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.once(Events.ClientReady, readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.on(Events.GuildMemberAdd, async guildMember => {
    await IsInOutfit(guildMember);
})

var Token = process.env.TOKEN;
client.login(Token);

// GUILD ENTER //
const APIToken = process.env.CENSUS_API_ID;
const outfit = process.env.OUTFIT_ALIAS;
const welcomeChannel = process.env.WELCOME_CHANNEL;
const guestRole = process.env.GUEST_ROLE;
const memberRole = process.env.MEMBER_ROLE;
const rolesChannel = process.env.ROLES_CHANNEL;

async function IsInOutfit(guildMember) {
    SendGenericWelcome(guildMember);
    var result = await fetch(`https://census.daybreakgames.com/s:${APIToken}/get/ps2:v2/character/?name.first=${guildMember.displayName}&c:resolve=outfit`,
        {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

    if (!result.ok) {
        SendTextToWelcomeChannel('Something went wrong with Census! Dumping contents.');
        console.log(result);
        AssignRole(guildMember, guestRole);
        return false;
    }

    result = await result.json();

    if (result.error != null) {
        SendTextToWelcomeChannel('Syntax Error. Dumping Log.');
        console.log(result);
        AssignRole(guildMember, guestRole);
        return false;
    }

    if (result.character_list.length === 0) {
        SendTextToWelcomeChannel('No characters with that name found.');
        AssignRole(guildMember, guestRole);
        return false;
    }

    result = result.character_list[0];

    if (result.name.first === 'undefined') {
        SendTextToWelcomeChannel('Not a valid Planetside 2 Username.');
        AssignRole(guildMember, guestRole);
        return false;
    }

    if (!result.hasOwnProperty('outfit')) {
        SendTextToWelcomeChannel('No outfit detected.');
        AssignRole(guildMember, guestRole);
        return false;
    }

    if (result.outfit.alias != outfit) {
        SendTextToWelcomeChannel(`User ${result.name.first} is in ${result.outfit.name}.`);
        AssignRole(guildMember, guestRole);
        return false;
    }

    SendTextToWelcomeChannel("Welcome Member!")
    AssignRole(guildMember, memberRole);
    return false;
}

function SendTextToWelcomeChannel(text) {
    var channel = client.channels.cache.get(welcomeChannel);
    if (channel.isTextBased) {
        channel.send(text);
    }
    else {
        console.log(`Channel: ${channel.name} wasn't a text based channel!`);
    }
}

function AssignRole(guildMember, role) {
    guildMember.roles.add(role);
}
