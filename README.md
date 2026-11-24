# NETHU-BOT V2
© 2026 MR HESHAN MD TECH WEB

Nethu AI WhatsApp Bot — 3 devices, **119 commands**, Sinhala / Singlish / English AI understanding.

## Render.com Deploy
1. GitHub repo එකකට upload කරන්න → Render → New Web Service → repo තෝරන්න
2. Build: `npm install` | Start: `npm start` | Node 20+
3. Environment: `ADMIN_PASSWORD` = ඔයාගේ password (+ අවශ්‍ය නම් `MONGODB_URL`, `API_KEY`)
4. Site එක open කරලා Device 1 / 2 / 3 හි number දාලා Pair Code ගන්න
5. ⚙️ → owner number, sudo, Gemini key (විකල්ප), logo, name දාන්න

## Bot එකට කතා කරන විදිහ
- **Prefix commands** (නමක් ඕන නෑ): `.menu` `.song ma diha` `.sticker` `.weather Kandy`
- **සාමාන්‍ය කතාවෙන්**: "නෙතූ ma diha සින්දුව දෙන්නකො", "nethu කොළඹ කාලගුණය", "නෙතු 25*4"
- **Bot ගේ message එකට reply** කළත්, **@mention** කළත් respond වෙනවා
- AI එක fail උනත් සින්දු / වීඩියෝ / sticker / menu / weather / calc වැනි ඒවා offline intent detection එකෙන් වැඩ කරනවා

## Commands (`.menu` එකෙන් ඔක්කොම)
| Category | Commands |
|---|---|
| ⚙️ General | menu ping alive runtime botinfo owner photo jid whoami forget |
| 🧠 AI | ai translate summarize explain rewrite story poem caption code email quote joke fact riddle pickup compliment advice imagine tts |
| 📥 Download | song video yts tiktok facebook instagram pinterest spotify download |
| 🖼️ Media | sticker toimg vv save dp bio setdp setname setbio poststatus qr |
| 👥 Group | tagall hidetag admins ginfo kick add promote demote mute unmute link revoke setgname setgdesc del antilink welcome warn resetwarn warns |
| 🧰 Tools | calc weather wiki define time currency shorten password base64 reverse upper lower count bmi age random |
| 🎉 Fun | dice flip choose 8ball ship rateme truth dare hug slap kiss pat punch cuddle poll |
| 👑 Owner | addsudo delsudo sudolist block unblock ban unban setprefix mode set setbotname addname delname names groups broadcast join leave restart |

Aliases ගොඩක් තියෙනවා (`.play` = `.song`, `.dl` = `.download`, `.s` = `.sticker` ...).

## Notes
- MongoDB / API (chamindu) ඒ විදිහටම. පරණ sessions, settings, memory ඔක්කොම දිගටම වැඩ කරනවා.
- Sticker හදන්න `sharp` භාවිතා කරනවා (optional dependency, `npm install` එකෙන්ම එනවා).
- `.set autoread on` වගේ settings chat එකෙන්ම වෙනස් කරන්න පුළුවන් (owner/sudo).
- Credentials (Mongo URL, API key) env vars වලට දාන එක හොඳයි: `MONGODB_URL`, `API_KEY`.
