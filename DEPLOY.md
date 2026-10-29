# Internet-ka (Deployment) — TAWAKAL

Hagahan waxa uu kuu sharraxayaa sida system-ka loo saaro internet-ka **bilaash**.
Waxaad u baahan tahay 3 account oo keliya:

| Adeeg | Shaqo | Qiimo |
|---|---|---|
| GitHub | Koodhka (waa haysataa) | Bilaash |
| [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) | Database-ka | Bilaash (M0) |
| [Render](https://render.com) | Server-ka (API + website) | Bilaash |

Natiijada: **https://tawakal-xxxx.onrender.com** — hal link, website-ka iyo admin-ka labaduba.

---

## Tallaabada 1 — MongoDB Atlas (database-ka)

1. Tag <https://www.mongodb.com/cloud/atlas/register> oo isku diiwaangeli (Google ama email).
2. Marka la weydiiyo, dooro **M0 FREE** → *Create*.
   - Provider: **AWS**, Region: **Frankfurt (eu-central-1)** (ugu dhow Somalia).
3. **Database Access** (menu-ga bidix) → *Add New Database User*:
   - Username: `tawakal`
   - Password: *Autogenerate* → **koobi (Copy)** oo meel ammaan ah ku kaydi.
   - Role: *Atlas admin*
   - *Add User*
4. **Network Access** → *Add IP Address* → **Allow Access from Anywhere** (`0.0.0.0/0`) → *Confirm*.
   - (Render-ka IP-diisu way is beddelaan, sidaas darteed 0.0.0.0/0 ayaa loo baahan yahay.)
5. **Database** → *Connect* → **Drivers** → koobi connection string-ka. Wuxuu u eg yahay:
   ```
   mongodb+srv://tawakal:<PASSWORD>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Ku beddel `<PASSWORD>` password-kaaga, kadibna ku dar magaca database-ka **`tawakal_db`**:
   ```
   mongodb+srv://tawakal:PASSWORD@cluster0.xxxxx.mongodb.net/tawakal_db?retryWrites=true&w=majority
   ```
   ✅ **Kani waa `MONGO_URI` — kaydi.**

> ⚠️ Password-ka haddii uu leeyahay xarfo gaar ah (`@ : / ?`), waa in la encode-gareeyaa.
> Si fudud: password-ka ka dhig xarfo iyo tirooyin keliya.

---

## Tallaabada 2 — Render (server-ka)

1. Tag <https://render.com> → **Get Started** → **Sign in with GitHub** → *Authorize*.
2. Dashboard → **New +** → **Blueprint**.
3. Dooro repo-ga **`abdiqaadirhilaal/Tawakal`** → *Connect*.
4. Render wuxuu si otomaatig ah u akhrinayaa faylka `render.yaml` (waan kuu diyaariyay).
5. Marka la weydiiyo **`MONGO_URI`**, geli connection string-kii Tallaabada 1.
6. Riix **Apply / Create Resources**.
7. Sug 5–10 daqiiqo (build-ka frontend-ka). Marka uu cagaar noqdo:
   - Link-kaaga: **https://tawakal-xxxx.onrender.com** (Render ayaa ku tusaya bogga kore).
   - Hubi in uu shaqeeyo: fur `https://tawakal-xxxx.onrender.com/api/health`
     → waa in uu soo celiyaa `{"success":true,...}`.

`JWT_SECRET` si otomaatig ah ayaa loo abuuraa — waxba ma gelinaysid.

---

## Tallaabada 3 — Abuur maamulaha (admin)

Ma jiro bog dadweyne oo lagu diiwaangeliyo maamule, sidaas darteed mid waa in la abuuraa.

**Habka A — Render Shell (fudud):**
1. Render → adeegga `tawakal` → tab **Shell**.
2. Geli:
   ```bash
   cd backend
   ADMIN_NAME="Maamule" ADMIN_EMAIL="email@kaaga.com" ADMIN_PASSWORD="FurahaAdag123" node scripts/createAdmin.js
   ```
3. Kadib soo gal: `https://tawakal-xxxx.onrender.com/login`
   - Email: `email@kaaga.com`, Password: `FurahaAdag123`
4. 🔐 Markaad soo gasho, **beddel password-ka** (Admin → Account).

**Habka B — computer-kaaga (haddii Shell uusan shaqayn):**
1. Fur `backend/.env`, kuna beddel `MONGO_URI` kii Atlas.
2. Terminal:
   ```powershell
   cd backend
   npm run create-admin
   ```

**Xog tusaale ah (ikhtiyaari):**
```bash
cd backend
node scripts/seed.js --force
```

---

## Tallaabada 4 — Isticmaalka

| Bog | Link |
|---|---|
| Website-ka | `https://tawakal-xxxx.onrender.com` |
| Soo gelidda | `https://tawakal-xxxx.onrender.com/login` |
| Dashboard | `https://tawakal-xxxx.onrender.com/admin` |
| POS | `https://tawakal-xxxx.onrender.com/admin/pos` |
| API health | `https://tawakal-xxxx.onrender.com/api/health` |

**Update koodhka:**
```powershell
cd C:\Users\hilaal\Downloads\Tawakal\tawakal-building-materials
git add .
git commit -m "waxa aan beddelay"
git push
```
Render si otomaatig ah ayuu u cusboonaysiin doonaa (~2 daqiiqo).

---

## Waxyaabaha la ogaado (muhiim)

1. **Free tier wuu seexdaa:** Render free wuxuu seexdaa 15 daqiiqo ka dib marka aan la isticmaalin.
   Marka ugu horreysa ee la furo waxay qaadan kartaa ~50 sekan. (Xalka: ping cron-job.org,
   ama plan-ka paid $7/bishii.)
2. **Sawirrada:** `backend/uploads/` waa disk ku meel gaar ah — marka server-ku dib u bilaabmo
   (deploy cusub), sawirrada la soo geliyay way tirmayaan. Xalka:
   - Render → *Disks* (plan paid), ama
   - Cloudinary/S3 (waa in koodhka wax laga beddelaa — weydii markaad diyaar tahay).
   Database-ka (Atlas) waxba kama lumo.
3. **Same-origin:** frontend-ka iyo API-gu isla domain ayay ku wada noqdaan, sidaas darteed
   cookie-ga admin-ku (`SameSite=Lax`) si sax ah ayuu u shaqeeyaa.
4. **Domain gaar ah** (tusaale `tawakal.so`): Render → Settings → *Custom Domain*, kadibna
   ku dar `CLIENT_URL=https://tawakal.so` env var-ka.
5. **Backup:** Atlas free wuxuu leeyahay backup otomaatig ah; sidoo kale `mongodump` ayaa loo isticmaali karaa.

---

## Dhibaatooyin caadi ah

| Calaamad | Sababta / Xalka |
|---|---|
| Build fails: `vite: not found` | Build command-ka hubi in uu yahay kii `render.yaml` |
| `MongoDB laguma xirmi karin` | `MONGO_URI` khaldan, ama Atlas Network Access ma oggola IP-ga |
| Login ma shaqeeyo (401) | Cookie wuxuu u baahan yahay HTTPS; hubi inaad isticmaalayso link-ka `https://` |
| Boggu wuu madhan yahay / 404 | Build-ka frontend-ku ma dhammaan; hubi in `frontend/dist` la dhisay (Render logs) |
| Sawirradii way lumeen | Disk ku meel gaar ah — eeg qodobka 2 ee kore |
