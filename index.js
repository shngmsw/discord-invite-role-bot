const config = require("./config.json");
const fs = require("fs");
const { Client, Intents, MessageAttachment } = require('discord.js');
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_INVITES,
  ],
});
// Initialize the invite cache
const invites = {};

// A pretty useful method to create a delay without blocking the whole script.
const wait = require("util").promisify(setTimeout);

client.on("ready", async () => {
  // "ready" isn't really ready. We need to wait a spell.
  await wait(1000);
  console.log(`Logged in as ${client.user.tag}!`);

  client.guilds.cache.forEach(g => {
    g.invites.fetch().then(guildInvites => {
      invites[g.id] = guildInvites;
    });
  });
});

client.on("guildMemberAdd", async (member) => {
  // To compare, we need to load the current invite list.
  const newInvites = await member.guild.invites.fetch();
  // This is the *existing* invites for the guild.
  const ei = invites[member.guild.id];

  invites[member.guild.id] = newInvites;
  // Look through the invites, find the one for which the uses went up.
  const invite = guildInvites.find(i => ei.get(i.code).uses < i.uses);
  if (invite !== null) {
    addRole(member, invite);
  }
});

const prefix = "~";
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;
  if (!message.member.permissions.has("ADMINISTRATOR")) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(" ");
  const command = args.shift().toLowerCase();

  switch (command) {
    case "add":
      add(message, args);
      break;
    case "remove":
      remove(message, args);
      break;
    case "list":
      list(message);
      break;
    default:
      message.reply(`command doesn't exist`);
  }

  if (command === "ping") {
    const timeTaken = Date.now() - message.createdTimestamp;
    message.reply(`Pong! This message had a latency of ${timeTaken}ms.`);
  }
});

function addRole(member, invite) {
  let rawdata = fs.readFileSync("invites.json");
  let _invites = JSON.parse(rawdata);

  const { roleID } = _invites[invite.code];
  if (roleID) {
    var role = member.guild.roles.cache.find(role => role.id === roleID);
    member.roles.add(role);
  }
}

function list(message) {
  const attachment = new MessageAttachment('invites.json', 'invites.json');
  message.reply({ content: '現在のリストです。', files: [attachment] });
}

function add(message, args) {
  let rawdata = fs.readFileSync("invites.json");
  let _invites = JSON.parse(rawdata);

  if (args.length !== 2) {
    message.reply(`not enough arguments`);
    return;
  }
  const base = "https://discord.gg/";
  if (args[0].substring(0, base.length) !== base) {
    message.reply(`missing link starting with \`${base}\``);
    return;
  }
  const inviteCode = args[0].substring(base.length);
  const roleprefix = "<@&";
  if (args[1].substring(0, roleprefix.length) !== roleprefix) {
    message.reply(`invalid role`);
    return;
  }
  const roleID = args[1].substr(
    roleprefix.length,
    args[1].length - roleprefix.length - 1
  );
  let role = message.guild.roles.cache.find(x => x.id === roleID);

  if (typeof role === undefined) {
    message.reply(`invalid role`);
    return;
  }

  _invites[inviteCode] = { roleID, name: role.name };

  let data = JSON.stringify(_invites, null, 2);
  fs.writeFileSync("invites.json", data);
  message.reply(
    `role @${role.name} added to invite link \`${base + inviteCode}\``
  );
}

client.login(config.BOT_TOKEN);
