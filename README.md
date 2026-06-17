# Oktatási napló

Node.js + Express + SQLite alapú oktatási napló alkalmazás helyi, céges hálózatos használatra.

## Teljes telepítés új szervergépen

Az alábbi lépések egy teljesen új Windows szervergépre vonatkoznak.

### 1. Git telepítése

1. Nyisd meg ezt az oldalt:

   ```text
   https://git-scm.com/download/win
   ```

2. Töltsd le és telepítsd a Git for Windows verziót.
3. A telepítőben az alapértelmezett beállítások általában megfelelőek.
4. Telepítés után nyiss egy új PowerShell ablakot, és ellenőrizd:

   ```powershell
   git --version
   ```

Ha verziószámot ír ki, a Git működik.

### 2. Node.js telepítése

1. Nyisd meg ezt az oldalt:

   ```text
   https://nodejs.org/
   ```

2. Töltsd le az **LTS** verziót.
3. Telepítsd alapértelmezett beállításokkal.
4. Nyiss egy új PowerShell ablakot, és ellenőrizd:

   ```powershell
   node --version
   npm --version
   ```

Ha mindkettő verziószámot ír ki, a Node.js és az npm működik.

### 3. Projekt klónozása GitHubról

Válassz egy mappát, ahová a projekt kerüljön. Példa:

```powershell
cd C:\Users\Public
mkdir Apps
cd Apps
```

Klónozás:

```powershell
git clone https://github.com/Widecho/oktatasi_naplo.git
```

Lépj be a projekt mappájába:

```powershell
cd oktatasi_naplo
```

### 4. Függőségek telepítése

Ajánlott:

```powershell
npm ci
```

Ha ez valamiért nem fut le:

```powershell
npm install
```

### 5. Adatbázis átmásolása

Az alkalmazás adatai az alábbi fájlban vannak:

```text
oktatasi_naplo.db
```

Ha egy meglévő gépről költözteted a rendszert, ezt a fájlt másold át az új szervergépen a projekt gyökerébe, például ide:

```text
C:\Users\Public\Apps\oktatasi_naplo\oktatasi_naplo.db
```

Fontos: az adatbázis helyben legyen a szervergépen, ne hálózati meghajtón.

### 6. Próbaindítás

A projekt mappájában futtasd:

```powershell
npm start
```

Sikeres indításnál ilyesmit látsz:

```text
Szerver elindult: http://localhost:3000
Hálózati elérés: http://192.168.1.25:3000
```

A szervergépen böngészőben:

```text
http://localhost:3000/login.html
```

Másik céges gépen:

```text
http://SZERVER_IP_CIME:3000/login.html
```

Példa:

```text
http://192.168.1.25:3000/login.html
```

### 7. Windows tűzfal engedélyezése

Ha más gépekről nem érhető el, engedélyezni kell a `3000`-es portot.

Admin PowerShellben:

```powershell
New-NetFirewallRule -DisplayName "Oktatasi Naplo 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### 8. Automatikus indítás bejelentkezéskor - ajánlott egyszerű módszer

Az ajánlott megoldás a Windows Startup mappa használata. Ehhez nem kell admin jogosultság, és általában megbízhatóbban működik egyszerű szervergépes környezetben, mint a Feladatütemező.

PowerShellben, a projekt mappájából futtasd:

```powershell
.\scripts\install-startup-shortcut.ps1
```

Ez létrehoz egy parancsikont az aktuális felhasználó Startup mappájában. A szerver a következő bejelentkezéskor automatikusan elindul.

Kézi teszt:

```powershell
.\scripts\start-server.ps1
```

Vagy:

```text
.\scripts\start-server.cmd
```

A szerver logja itt található:

```text
logs\server.log
```

Startup indítás eltávolítása:

```powershell
.\scripts\uninstall-startup-shortcut.ps1
```

### 9. Alternatív automatikus indítás Feladatütemezővel

Ha a Startup mappás megoldás helyett mégis Feladatütemezőt szeretnél használni:

```powershell
.\scripts\install-startup-task.ps1
```

Kézi tesztindítás:

```powershell
Start-ScheduledTask -TaskName "OktatasiNaploServer"
```

Állapot ellenőrzése:

```powershell
Get-ScheduledTask -TaskName "OktatasiNaploServer"
Get-ScheduledTaskInfo -TaskName "OktatasiNaploServer"
```

Feladatütemezős automatikus indítás eltávolítása:

```powershell
.\scripts\uninstall-startup-task.ps1
```

Ha nem indul el, először a `logs\server.log` fájlt kell megnézni. Ha nincs `logs\server.log`, akkor az automatikus indítás el sem jutott az indító script futtatásáig.

## Frissítés GitHubról

Ha később frissíteni kell a szerveren lévő kódot:

```powershell
cd C:\Users\Public\Apps\oktatasi_naplo
git pull
npm ci
```

Ezután indítsd újra a szervert vagy a gépet.

## Fontos üzemeltetési megjegyzések

- A `node_modules` mappát nem kell másolni, azt az `npm ci` vagy `npm install` újra létrehozza.
- Az `oktatasi_naplo.db` tartalmazza az adatokat, ezért erről rendszeresen készüljön mentés.
- Admin felületen is letölthető adatbázis-mentés.
- A szervergépnek érdemes fix IP-címet vagy DHCP-foglalást adni, hogy a kliensgépeken használt URL ne változzon.
