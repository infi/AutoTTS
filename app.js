const Discord = require("discord.js")
const dotenv = require("dotenv")
const cp = require("child_process")
const fs = require("fs")
const langs = require("./langs.json")
const tesseract = require("tesseract.js")

const { MessageEmbed } = Discord

dotenv.config()

const client = new Discord.Client()

client.on("ready", () => {
    console.log("Ready!!!")
})

const settingsfile = require("path").join(__dirname, "botsettings.json")

/**
 * Get Setting
 * @param {String} key Key
 */
const getSetting = (key) => {
    const settings = JSON.parse(fs.readFileSync(settingsfile).toString())

    return settings[key]
}

/**
 * Set Setting
 * @param {String} key Key
 * @param {String} value Value
 */
const setSetting = (key, value) => {
    const settings = JSON.parse(fs.readFileSync(settingsfile).toString())

    settings[key] = value

    fs.writeFileSync(settingsfile, JSON.stringify(settings, null, 2))
}

const prefix = getSetting("prefix") ?? "tts:"

client.on("message", async message => {
    if (message.author.bot) return
    if (!message.guild) return

    if (message.content.startsWith(prefix)) {
        const parts = message.content.split(" ")
        const cmd = parts[0].substr(prefix.length)
        const args = parts.slice(1)

        if (cmd === "settings") {
            const _prefix = getSetting("prefix")
            const _lang = getSetting("tts_lang")
            const _speed = getSetting("tts_speed")

            const em = new MessageEmbed()
            em.setColor(0x00ff00)

            em.addField("prefix", _prefix, true)
            em.addField("lang", _lang, true)
            em.addField("speed", _speed + " words/min", true)

            em.setTitle("Settings")

            return message.channel.send(em)
        } else if (cmd === "setlang") {
            const curlang = getSetting("tts_lang")

            if (!langs.includes(args[0])) return message.channel.send("Invalid language! See "
                + prefix + "langs for a list of languages")

            setSetting("tts_lang", args[0])

            const em = new MessageEmbed()
            em.setColor(0x00ff00)
            em.setTitle("Changed language")
            em.addField("Old language", curlang, true)
            em.addField("New language", args[0], true)

            return message.channel.send(em)
        } else if (cmd === "langs") {
            message.channel.send(`**Valid languages**\n\n${langs.join(", ")}`)
        } else if (cmd === "setspeed") {
            if (isNaN(args[0])) return message.channel.send("Speed must be a number")

            const speedf = parseInt(args[0])

            if (speedf < 80 || speedf > 450) return message.channel.send("Speed may not be under 80 wpm or 450 wpm for technical reasons")

            const oldSpeed = getSetting("tts_speed")

            setSetting("tts_speed", speedf)

            const em = new MessageEmbed()
            em.setColor(0x00ff00)
            em.setTitle("Changed speed")
            em.addField("Old speed", oldSpeed + " words/min", true)
            em.addField("New speed", getSetting("tts_speed") + " words/min", true)

            message.channel.send(em)
        } else if (cmd === "resetspeed") {
            const oldSpeed = getSetting("tts_speed")

            setSetting("tts_speed", 175)

            const em = new MessageEmbed()
            em.setColor(0x00ff00)
            em.setTitle("Reset speed")
            em.addField("Old speed", oldSpeed + " words/min", true)
            em.addField("New speed", "175 words/min", true)

            message.channel.send(em)
        } else if (cmd === "help") {
            const em = new MessageEmbed()
            em.setColor(0x00ff00)
            em.setTitle("Commands")
            em.setDescription("settings, setlang, langs, setspeed, resetspeed, help")
            em.setFooter("In order of implementation")

            message.channel.send(em)
        }

        return
    }

    let connection

    try {
        connection = await message.member.voice?.channel?.join()
    } catch (e) {
        return message.channel.send("Oh no\n\n" + e)
    }

    if (!connection) return message.channel.send("No Connection")

    if (message.attachments.filter(x => {
        return x.name.endsWith(".png") || x.name.endsWith(".jpg") || x.name.endsWith(".bmp")
    }).size > 0) {
        const t = await tesseract.recognize(message.attachments.first().url, "eng")

        fs.writeFileSync("tts.txt", t.data.text)

        const em = new MessageEmbed()
        em.setColor(0x00ff00)
        em.setTitle("OCR")
        em.setDescription(t.data.text)
        em.setFooter("For best results, use English.")

        message.channel.send(em)
    } else {
        fs.writeFileSync("tts.txt", message.cleanContent)
    }

    cp.execSync("/usr/bin/espeak -f tts.txt -w tts.wav -v " + getSetting("tts_lang") + " -s " + getSetting("tts_speed"))

    const play = connection.play("./tts.wav", {
        volume: 1.2
    })

    play.on("finish", () => {
        message.member.voice?.channel?.leave()
    })

})

client.login(process.env.TOKEN)