# TAWAKAL Building Materials & Supplies

Website iyo nidaam maamul oo dhammaystiran oo loogu talagalay bakhaar alaab dhisme: website dadweyne (alaab, dambiil, dalab, WhatsApp, raadraac), **kaash (POS)** oo loogu talagalay macaamiisha bakhaarka imanaya (iib, rasiid, shifts, celin), iyo dashboard maamul (alaab, qaybo, dalabyo, kayd, macaamiil, warbixinno, dejin).

- **Frontend:** React 18 + Vite, React Router, Tailwind CSS, Axios, React Hook Form, Zod, Lucide
- **Backend:** Node.js + Express, MongoDB + Mongoose, JWT (cookie HttpOnly), bcryptjs, Zod, Helmet, Rate Limit, CORS
- **Luqadda website-ka:** Af Soomaali

> **Xaaladda tijaabada.** Koodhkan waxaa lagu qoray goob aan lahayn npm iyo MongoDB, sidaas darteed app-ka oo dhan iyo tijaabooyinka backend-ka (Jest) **laguma socodsiin halkaas**. Waxa la hubiyey: qaab-qoraalka fayl kasta, in import kasta uu helo export-kiisa, validators-ka backend-ka iyo foomamka frontend-ka (Zod dhab ah), mantiqa dambiisha/WhatsApp iyo xisaabinta kaashka (wadar, qiimo-dhimis, baaqi, celin), iyo in bog kasta (POS-ku ku jiro) uu render-gareeyo xog tusaale ah door kasta (xaaladaha: xog, madhan, soo raraya, khalad). Socodsii `npm test` (qaybta 12) kombiyuutarkaaga ka hor inta aadan ku tiirsan.

---

## 1. Waxa aad u baahan tahay (Windows)

1. **Node.js LTS** (20 ama ka cusub): ka soo deji <https://nodejs.org>, rakib, kadibna fur PowerShell cusub:
   ```powershell
   node -v
   npm -v
   ```
2. **MongoDB Community Server**: ka soo deji <https://www.mongodb.com/try/download/community>. Marka aad rakibayso dooro **"Install MongoDB as a Service"** (sidaas ayuu si toos ah u bilaabmayaa). Ikhtiyaari: rakib **MongoDB Compass** si aad xogta u aragto.
3. **VS Code**: <https://code.visualstudio.com>

### Hubi in MongoDB socdo

```powershell
Get-Service MongoDB
```

Haddii uu yahay `Stopped`, fur PowerShell **Run as administrator**:

```powershell
Start-Service MongoDB
```

## 2. Fur mashruuca

Furfur ZIP-ka, kadibna VS Code: **File > Open Folder** > `tawakal-building-materials`. Fur laba terminal (**Terminal > New Terminal**): mid backend, mid frontend.

## 3. Backend: rakib oo deji

```powershell
cd backend
npm install
copy .env.example .env
```

Samee sir JWT ah oo random ah:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Fur `backend/.env` oo ku beddel `JWT_SECRET` qiimaha soo baxay:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/tawakal_db
JWT_SECRET=<qiimaha aad hadda samaysay>
CLIENT_URL=http://localhost:5173
REPORT_TIMEZONE=Africa/Mogadishu
```

`mongodb://localhost:27017` wuxuu shaqeeyaa **kaliya** kombiyuutarka uu MongoDB ku socdo. Server dibadda ah wuxuu u baahan yahay connection string u gaar ah (eeg qaybta 14).

## 4. Abuur maamulaha ugu horreeya

Ma jiro bog dadweyne oo lagu diiwaangeliyo maamule. Maamulaha koowaad waxaa lagu abuuraa amarkan:

```powershell
npm run create-admin
```

Wuxuu ku weydiinayaa magaca, email-ka, iyo furaha sirta ah (ugu yaraan 10 xaraf). Furaha waxaa lagu kaydiyaa bcrypt hash ahaan. Maamulayaal iyo shaqaale dheeraad ah waxaa laga abuuraa **Maamulka > Isticmaalayaasha**.

## 5. Xog tusaale ah (ikhtiyaari)

```powershell
npm run seed
```

Wuxuu ku darayaa 6 qaybood iyo 15 alaab oo **tusaale ah** (SKU-yadoodu waxay ku bilaabmaan `DEMO-`, qiimayaashuna ma aha kuwa dhabta ah). Ma tirtiro mana beddelo xog jirta, wuxuuna diidayaa `NODE_ENV=production`. Ma abuuro dalabyo, macaamiil, ama markhaatiyaal.

## 6. Bilow backend-ka

```powershell
npm run dev
```

Waa in aad aragto `MongoDB waa lagu xirmay` iyo `TAWAKAL API wuxuu ka socdaa http://localhost:5000/api`. Tijaabi: <http://localhost:5000/api/health>.

## 7. Frontend: rakib oo bilow (terminal-ka labaad)

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## 8. Fur website-ka

| Bog | Cinwaan |
| --- | --- |
| Website-ka | <http://localhost:5173> |
| Maamulka | <http://localhost:5173/admin> |

Isticmaal `localhost` labada dhinacba (ha isku qasin `127.0.0.1`), si cookie-ga iyo CORS-ku u shaqeeyaan.

**Tallaabada koowaad kadib soo gelidda:** tag **Maamulka > Dejinta** oo geli taleefanka, lambarka WhatsApp (tusaale `25261XXXXXXX`), cinwaanka, saacadaha shaqada, iyo qoraalka "Nagu Saabsan". Ilaa aad geliso, badhamada WhatsApp way damsan yihiin, xogta xiriirkuna waxay muujinaysaa "Weli lama gelin". Halkaas ayaad sidoo kale ka soo dejin kartaa logo-gaaga.

## 9. Waxa nidaamku qabto

**Website-ka dadweynaha**

- Bogga hore, Alaabta (raadin, qayb, kala-saarid, bog-u-qaybin), faahfaahinta alaabta, Nagu Saabsan, Xiriir.
- Dambiil ku kaydsan browser-ka; qiimaha iyo kaydka waxaa laga cusboonaysiiyaa server-ka marka dambiisha la furo.
- Dalab: server-ka ayaa hubiya alaabta, kaydka, xisaabiyana wadarta. Qiimaha macmiilku soo diro lama aqbalo.
- WhatsApp: badhan sabaynaya, mid alaab kasta, mid dambiisha, mid xiriirka. Farriinta dambiisha waxay si cad u sheegtaa in dalabku **uusan weli ku kaydsanayn** nidaamka. Furitaanka WhatsApp weligeed dalab kama dhigo mid la xaqiijiyey ama la bixiyey.
- Raadraaca dalabka: lambarka dalabka + taleefanka. Wuxuu soo celiyaa xog kooban (cinwaan, email iyo taleefan ma jiraan).

**Maamulka (`/admin`)**

- Dashboard: tirooyin ka yimid database-ka, shaxda iibka (7 maalmood / 30 maalmood / 12 bilood), dalabyadii dambe, alaabta ugu iibka badan.
- Alaabta iyo Qaybaha: abuur, beddel, kaydi (archive), sawirro. Qayb alaab leh lama tirtiri karo.
- Dalabyada: raadin, shaandhayn, xaaladaha, lacag bixinta, qoraallo gudaha ah, daabacaadda qaansheegta.
- Kaydka: helitaanka alaabta alaab-qeybiyaha (qiimaha iibsiga la diiwaangeliyo), hagaajin leh sabab, taariikhda dhaqdhaqaaq kasta (qofka, waqtiga, ka hor/kadib).
- Macaamiisha: laga soo saaray dalabyada (macaamiishu akoon ma laha).
- Warbixinno: iibka maalinle/toddobaadle/bille/sannadle, alaab iyo qayb ahaan, xaaladaha dalabyada, qiimaha kaydka, kayd yar. Waa la daabici karaa.
- Farriimaha, Dejinta, Isticmaalayaasha, Akoonkayga.

**Doorarka** (waxaa lagu hubiyaa server-ka codsi kasta; qarinta badhanku kuma filna)

| Awood | Maamule | Manager | Shaqaale xafiis | Kaashiye |
| --- | --- | --- | --- | --- |
| Xafiiska: alaab, qaybo, dalabyo online, hagaajinta kaydka, farriimo | Haa | Haa | Haa | Maya |
| Kaashka (POS): iib, rasiid, shift-kiisa, iibkiisa | Haa | Haa | Maya | Haa |
| Arag iibka iyo shifts-ka kaashiyeyaasha oo dhan | Haa | Haa | Maya | Maya |
| Oggolow qiimo-dhimis ka badan xadka, iyo celin | Haa | Haa | Maya | Maya |
| Hagaajinta lacagta shift-ka, xir shift qof kale | Haa | Haa | Maya | Maya |
| Warbixinnada POS | Haa | Haa | Maya | Maya |
| Arag/beddel qiimaha iibsiga (cost) | Haa | Maya | Maya | Maya |
| Beddel xaaladda lacag bixinta dalabka online | Haa | Maya | Maya | Maya |
| Hel alaab (rasiid alaab-qeybiye), dejin, isticmaalayaal, diiwaanka hawlaha | Haa | Maya | Maya | Maya |

Kaashiyuhu marka uu soo galo wuxuu si toos ah u tagaa `/admin/pos`, mana arko bogagga xafiiska.

### Kaashka (POS): `/admin/pos`

Loogu talagalay macaamiisha bakhaarka imanaya, lacagta ku bixiya kaashka, alaabtana isla markaas qaata. Waa kanaal ka duwan dalabyada online-ka ah, laakiin wuxuu isticmaalaa **isla alaabta iyo isla kaydka**.

**Bilowga**

1. Maamule ahaan: **Isticmaalayaasha > Isticmaale cusub**, dooro doorka **Kaashiye** (ama **Manager**).
2. **Dejinta > Kaashka (POS)**: deji xadka qiimo-dhimista, hababka lacag bixinta, iyo qoraalka rasiidka.
3. Kaashiyuhu wuu soo galaa, wuxuu tiriyaa lacagta khasnadda, wuxuuna furaa shift.

**Socodka iibka**

1. Raadi magac ama SKU, dooro qayb, ama scan-garee barcode (scanner-ku wuxuu qoraa koodhka kadibna Enter; koodh sax ah si toos ah ayaa dambiisha loogu daraa). Barcode-ka alaabta waxaa lagu geliyaa foomka alaabta.
2. Beddel tirada, geli magaca/taleefanka macmiilka (ikhtiyaari), iyo qiimo-dhimis haddii la oggol yahay.
3. **Dhammaystir iibka**: dooro habka lacag bixinta. Caddaan: geli lacagta la helay, nidaamkuna wuxuu muujiyaa baaqiga. Mobile money/bangi: geli tixraaca (ikhtiyaari).
4. Server-ku wuxuu hubiyaa alaabta iyo kaydka, wuxuu xisaabiyaa wadarta qiimaha database-ka, wuxuu dhimaa kaydka, wuxuuna abuuraa iibka iyo rasiidka. Dambiisha waxaa la faaruqiyaa kaliya marka taasi guuleysato.
5. **Daabac rasiidka** ama **Iibka xiga**.

**Xeerarka**

- **Qiimo iyo wadar lagama aqbalo browser-ka.** Kaliya aqoonsiga alaabta iyo tirada ayaa la diraa.
- **Tirada:** tiro dhan alaabta caadiga ah (kiish, xabbo, xirmo). Jajab kaliya alaabta loo dejiyey “waxaa lagu iibin karaa tiro jajab ah” (mitir, kg).
- **Qiimo-dhimis** (iibka oo dhan, boqolley ama lacag): kaashiyuhu ilaa xadkiisa (default 5%). Ka badan taas: maamule ama manager ayaa email-kiisa iyo furihiisa geliya, magaciisana waa la diiwaangeliyaa. Xadka guud (default 20%) qofna kama gudbi karo. Wadartu ma noqon karto taban. Qiimo-dhimis saf-saf ah ma jirto noocan.
- **Lacag bixin:** hal hab iibkiiba. Model-ku wuxuu leeyahay liis `payments` si lacag-bixin la kala qaybiyey mustaqbalka loogu daro.
- **Mobile money iyo bangi lama xaqiijiyo si toos ah.** Nidaamku wuxuu kaydiyaa habka iyo tixraaca, iibkana wuxuu ku calaamadiyaa “kaashiyaha ayaa diiwaangeliyey”. Kaashiyaha ayaa mas'uul ka ah in uu hubiyo in lacagtu soo dhacday.
- **Laba kaashiye iyo alaabta ugu dambeysa:** isla habka dalabyada online-ka (update atomic ah oo shuruud leh + dib-u-celin). Midkood uun baa guuleysanaya.
- **Codsi la soo celiyey** (`idempotencyKey`): hal iib, hal dhimis kayd.
- **Lambarrada:** iib `S-YYMMDD-0001`, rasiid `R-000001`, celin `RF-YYMMDD-0001`.

**Rasiidka:** wuxuu ku daabacmaa ballac 76mm (printer-yada rasiidhada ee 80mm), A4-na dhexda ayuu ka soo baxaa. Marka la daabacayo, rasiidka oo kaliya ayaa soo baxa (menu iyo dashboard ma jiraan). Daabacaadda browser-ka dooro cabbirka warqadda ee printer-kaaga. Dib-u-daabacaadda waxaa laga sameeyaa **Iibka POS > rasiidka > Daabac rasiidka**, waana la diiwaangeliyaa. Kaashiyuhu wuxuu dib u daabici karaa iibkiisa oo kaliya.

**Shifts iyo lacagta caddaanka ah**

```
Lacagta la filayo = lacagta furitaanka
                  + iibka caddaanka ah
                  - celinta caddaanka ah
                  + hagaajinta la diiwaangeliyey (+/-)

Farqiga = lacagta la tiriyey - lacagta la filayo
```

Mobile money iyo bangi kuma jiraan lacagta khasnadda. Marka shift la xirayo, kaashiyuhu wuxuu geliyaa lacagta uu tiriyey; farqiga, qofka xiray, waqtiga iyo faallada waa la kaydiyaa. Hagaajinta lacagta (tusaale lacag bangiga la geeyey) waxaa samayn kara manager ama maamule oo kaliya, sabab ayayna u baahan tahay. Iib la dhammeeyey lama beddeli karo si farqi loo qariyo.

**Celinta (refunds)**

- Waxaa laga sameeyaa faahfaahinta iibka (**Iibka POS > rasiidka > Celin**); mar walba waxay tixraacdaa iib hore, sabab ayayna u baahan tahay.
- Manager/maamule: si toos ah. Kaashiye: iibkiisa oo kaliya, oo leh oggolaansho maamule.
- Lacagta la celiyo waa qiimaha **saafiga ah** (qiimo-dhimista kadib). Lama celin karo wax ka badan intii la iibiyey.
- **“Kaydka ku celi”** calaamadee kaliya marka alaabta gacanta lagu soo celiyey oo la iibin karo. Alaab dhaawacan kaydka kuma noqoto.
- Celinta caddaanka ah waxay ka go'daa shift-ka furan ee qofka fulinaya (shift furan ayuu u baahan yahay).
- Iibka asalka ah lama tirtiro: xaaladdiisu waxay noqotaa “Qayb la celiyey” ama “La celiyey”.

Saddex xaaladood oo kala duwan: (1) **iib fashilmay** ka hor dhammaystirka (kayd ama lacag aan ku filnayn): iib lama abuuro, kaydkana lama taabto; fashilka kaydka waxaa lagu qoraa diiwaanka hawlaha. (2) **Dambiil la faaruqiyey** ka hor lacag bixinta: waxba lama kaydiyo. (3) **Iib la dhammeeyey oo kadib la celiyey**: iibka iyo celinta labaduba way sii jiraan.

**Diiwaanka hawlaha** (`/admin/diiwaanka`, maamule): iib, iib fashilmay, qiimo-dhimis la oggolaaday, celin, furitaanka/xiritaanka shift, hagaajin lacag, dib-u-daabacaad.

## 10. Xeerarka ganacsiga ee muhiimka ah

- **Laba kanaal, hal kayd.** Dalabka online-ka ah wuxuu kaydka dhimaa (kaydiyaa) marka la diro, wuxuuna soo celiyaa haddii la joojiyo. POS wuxuu iibiyaa kaydka hadda jira. Sidaas darteed alaab laba jeer lama iibin karo.
- **Dakhliga guud** = (iibka POS − celinta POS) + dalabyada online-ka ah ee **la gaarsiiyey**. Dalab online ah oo sugaya ama la joojiyey kuma jiro dakhliga.
- Online: **Dakhli** = wadarta dalabyada **la gaarsiiyey**. **Iib** = wadarta dalabyada aan la joojin, taariikhda dalabka. Dalabyada la joojiyey kuma jiraan midkoodna.
- POS: **Iib** = wadarta guud ee iibka la dhammeeyey (taariikhda iibka). **Celin** = lacagta la celiyey (taariikhda celinta). **Saafi** = iib − celin.
- **Xaaladaha dalabka:** Sugaya → La xaqiijiyey → La diyaarinayo → (Diyaar u ah qaadasho | Waddada ku jira) → La gaarsiiyey. Joojin waa la oggol yahay ka hor gaarsiinta. Dalab dhammaaday ama la joojiyey lama beddeli karo.
- **Joojinta** waxay kaydka soo celisaa hal mar oo kaliya.
- **Kaydka** laguma beddeli karo foomka alaabta; kaliya bogga Kaydka, si isbeddel kasta loo diiwaangeliyo.
- **"Tirtir alaab"** = kayd-gelin (archive). Alaabta lama tirtiro, si diiwaanka iibku u ahaado mid sax ah.
- **Lacag online ah ma jirto.** Hababka lacag bixintu waa kuwo gacanta lagu maareeyo; maamulaha ayaa calaamadiya "La bixiyey".

### Ka hortagga iibinta ka badan kaydka

MongoDB-ga maxalliga ah (standalone) ma taageero transactions (waxay u baahan yihiin replica set). Sidaas darteed nidaamku wuxuu isticmaalaa habkan oo ka shaqeeya nooc kasta oo MongoDB ah:

1. Alaab kasta waxaa laga dhimaa kaydka hal update oo atomic ah oo leh shuruud `stock >= tirada`. Laba dalab oo isku mar yimid midkood uun baa guuleysanaya.
2. Haddii alaab kasta fashilanto, wixii hore loo dhimay dib ayaa loo celiyaa, dalabna lama abuuro.
3. Dalab kasta wuxuu wataa `idempotencyKey`. Haddii foomka laba jeer la diro, hal dalab uun baa la abuurayaa, kaydkana hal mar uun baa la dhimayaa. Isla habkaas ayaa loo isticmaalaa hagaajinta kaydka iyo rasiidhada.

Xaddidaad: haddii server-ku dhaco inta u dhexeysa dhimista kaydka iyo kaydinta dalabka, kaydku wuu ka yaraan karaa xaqiiqda. Taas waxaa lagu saxaa hagaajin kayd. Haddii aad u guurto MongoDB Atlas (replica set), tallaabooyinkan waxaa lagu duubi karaa transaction dhab ah.

## 11. Amniga

- Furayaasha: bcryptjs. Akoonka waa la xiraa 15 daqiiqo kadib 5 isku day oo khaldan; soo gelidda waxaa lagu xaddiday 10 codsi 15-kii daqiiqo ee IP kasta.
- Fadhiga: JWT ku jira cookie `HttpOnly`, `SameSite=Lax` (`Secure` marka production). JavaScript-ku ma akhrin karo token-ka. Beddelidda furaha waxay burisaa fadhiyada kale.
- CSRF: codsi kasta oo wax beddelaya wuxuu u baahan yahay header `X-Requested-With`, CORS-kuna wuxuu oggol yahay kaliya cinwaannada ku jira `CLIENT_URL`.
- Hubinta xogta: Zod, labada dhinac. Goobo aan la aqoon waa la diidaa (ka hortagga mass-assignment). ID-yada iyo query-yada waa la hubiyaa; raadinta xarfaha regex-ka waa laga nadiifiyaa.
- Jawaabaha dadweynaha kuma jiraan `costPrice`, xadka kaydka, ama xogta macaamiisha kale. Khaladaadka server-ka faahfaahintooda lama muujiyo.
- Sirtu waxay ku jirtaa `.env` (Git ma galo). `.env.example` wuxuu wataa qiimayaal tusaale ah oo kaliya.

### Sawirrada

Sawirrada alaabta waxaa lagu kaydiyaa `backend/uploads/` (kaydin maxalli ah). Nooca waxaa lagu hubiyaa bytes-ka faylka (JPG, PNG, WEBP; ugu badnaan 3MB), magacana waa la beddelaa. **Fiiro:** adeegyada hosting-ka qaarkood faylasha way tirtiraan marka server-ku dib u bilaabmo. Production-ka, isticmaal disk joogto ah ama kaydin sawirro oo gaar ah (Cloudinary, S3), nuqulna ka qaad galka `uploads`.

Mashruucu ma wato sawirro dhab ah oo alaab ah. Ilaa aad sawir soo dejiso, alaab kasta waxay muujinaysaa sawir-qaybeed.

## 12. Tijaabooyinka

**Backend** (Jest + Supertest + mongodb-memory-server):

```powershell
cd backend
npm test
```

Markii ugu horreysay wuxuu soo dejinayaa MongoDB ku-meel-gaar ah (wuxuu u baahan yahay internet; database-kaaga dhabta ah ma taabto). Waxa la tijaabiyo: soo gelidda iyo xiritaanka akoonka, helitaanka aan la oggolayn, CSRF, doorarka, abuurista/cusboonaysiinta alaabta, raadinta iyo bog-u-qaybinta, qiimo iyo tiro aan sax ahayn, xisaabinta wadarta, kayd aan ku filnayn, dalabyo isku mar ah (overselling), codsi labo-jibbaarmay, dhaqdhaqaaqa kaydka, u-gudubka xaaladaha, soo celinta kaydka, foomka xiriirka, sirta xogta dadweynaha, iyo maareynta khaladaadka. **POS** (`tests/pos.test.js`): helitaanka door kasta, raadinta alaabta iyo barcode, wadarta server-ka, lacagta la helay iyo baaqiga, tirada iyo halbeegga, kayd aan ku filnayn, laba kaashiye oo isku mar iibinaya, codsi la soo celiyey, kaydka la wadaago ee POS iyo online, siyaasadda qiimo-dhimista iyo oggolaanshaha, taariikhda iibka iyo shaandhaynta, rasiidka, furitaanka/xiritaanka shift, lacagta la filayo iyo farqiga, celinta (oggolaansho, xad, kayd, labo-jibbaar), iyo warbixinnada labada kanaal.

**Frontend** (Vitest): mantiqa dambiisha, farriimaha WhatsApp, tallaabooyinka xaaladaha, iyo xisaabinta kaashka (wadar, qiimo-dhimis, baaqi, celin).

```powershell
cd frontend
npm test
```

**API gacanta** (PowerShell):

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod "http://localhost:5000/api/products?limit=5"
```

Liiska buuxa ee waddooyinka: [`docs/API.md`](docs/API.md).

## 13. Cilad-bixin

| Dhibaato | Xal |
| --- | --- |
| `MongoDB laguma xirmi karin` | Adeeggu ma socdo: `Start-Service MongoDB` (admin). Hubi `MONGO_URI`. |
| `JWT_SECRET lama helin` | Ma aadan abuurin `backend/.env`, ama `JWT_SECRET` waa madhan yahay. |
| `EADDRINUSE :5000` | Port-ka waa la isticmaalayaa. Beddel `PORT` (iyo `VITE_API_URL`), ama xir barnaamijka kale. |
| Khalad CORS ah / soo gelidda ma shaqeynayso | `CLIENT_URL` waa in uu la mid yahay cinwaanka frontend-ka (`http://localhost:5173`). Isticmaal `localhost` labada dhinac. Dib u bilow backend-ka kadib beddelka `.env`. |
| Website-ku wuxuu leeyahay "Server-ka lama gaari karo" | Backend-ku ma socdo ama `VITE_API_URL` waa khalad. Dib u bilow `npm run dev` kadib beddelka `.env`. |
| `npm` lama aqoonsan | Xir oo fur terminal-ka kadib rakibidda Node.js. |
| PowerShell wuu diidayaa scripts | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Port 5173 waa la isticmaalayaa | Xir Vite-ka kale, ama beddel port-ka `vite.config.js` iyo `CLIENT_URL`. |
| Kaashiyuhu ma iibin karo: “Marka hore fur shift” | Wuxuu u baahan yahay shift furan (**Shifts > Fur shift**), ama dami qasabka shift-ka Dejinta. |
| Rasiidku wuxuu la soo baxayaa bogga oo dhan | Browser-kaagu ma taageero CSS `:has()`. Cusboonaysii Chrome/Edge/Firefox. |
| Furaha maamulaha waa la illoobay | Maamule kale ha ka beddelo, ama ku abuur maamule cusub `npm run create-admin`. |

## 14. U diyaarinta internet-ka (deployment)

> **Hagaha buuxa (tallaabo-tallaabo, bilaash):** eeg [`DEPLOY.md`](DEPLOY.md) — MongoDB Atlas + Render.
> Production-ka frontend-ka iyo API-gu waxay ku wada noqdaan hal domain (Render), sidaas darteed
> cookie-ga fadhiga wuu shaqeeyaa. Faylka `render.yaml` ayaa deployment-ka si otomaatig ah u habeeya.

1. **Database:** isticmaal MongoDB la maareeyo (tusaale MongoDB Atlas) ama server si fiican loo ilaaliyey: isticmaale leh fure adag, IP allowlist, TLS. Geli connection string-ka `MONGO_URI`. Weligaa ha u furin port 27017 internet-ka.
2. **Backend `.env`:** `NODE_ENV=production`, `JWT_SECRET` cusub oo dheer, `CLIENT_URL=https://domain-kaaga`. Server-ku wuu diidayaa in uu bilaabmo haddii `JWT_SECRET` uu yahay kan tusaalaha ah.
3. **HTTPS waa qasab:** cookie-ga `Secure` wuxuu shaqeeyaa kaliya HTTPS.
4. **Isku site:** frontend-ka iyo API-ga ku rid isku domain (tusaale `tawakal.so` iyo `api.tawakal.so`, ama reverse proxy `/api`). Cookie-ga `SameSite=Lax` ma shaqeeyo laba domain oo kala duwan.
5. **Frontend:** `VITE_API_URL=https://api.domain-kaaga/api`, kadibna `npm run build`. Galka `frontend/dist` ku rid hosting static ah; u deji in waddo kasta ay ku noqoto `index.html` (SPA fallback).
6. **Backend:** `npm ci --omit=dev` kadibna `npm start`, adigoo isticmaalaya process manager (PM2, systemd, ama adeegga hosting-ka).
7. **Sawirrada:** eeg fiirada qaybta 11.
8. **Nuqul kayd ah:** si joogto ah nuqul uga qaad database-ka (`mongodump`) iyo galka `uploads`.
9. Ha socodsiin `npm run seed` production-ka.

## 15. Qaab-dhismeedka

```
tawakal-building-materials/
├── backend/
│   ├── config/        env, db, constants
│   ├── models/        User, Product, Category, Order, Sale, CashierShift, Refund, AuditLog, InventoryMovement, ContactMessage, CompanySettings, Counter
│   ├── controllers/   mantiqa codsiyada
│   ├── services/      orderService, posService, shiftService, inventoryService, reportService, posReportService, authService, auditService
│   ├── validators/    Zod schemas
│   ├── middleware/    auth, validate, rateLimiters, upload, error
│   ├── routes/        public.js, admin.js, pos.js
│   ├── scripts/       createAdmin.js, seed.js
│   ├── tests/         Jest + Supertest
│   ├── utils/  uploads/  app.js  server.js
├── frontend/
│   └── src/
│       ├── components/ (common, layout, products, cart, admin, pos)
│       ├── layouts/  pages/ (public, auth, admin, admin/pos)
│       ├── context/  hooks/  services/  schemas/  utils/
│       ├── App.jsx  AdminApp.jsx  main.jsx
├── docs/API.md
└── README.md
```
