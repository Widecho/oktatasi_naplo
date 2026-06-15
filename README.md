# Oktatási napló

Node.js + Express + SQLite alapú oktatási napló alkalmazás.

## Indítás helyi hálózaton

1. A szervergépen telepítsd a függőségeket:

   ```bash
   npm install
   ```

2. Indítsd el a szervert:

   ```bash
   npm start
   ```

3. A konzol kiírja a helyi és hálózati elérési címet, például:

   ```text
   Szerver elindult: http://localhost:3000
   Hálózati elérés: http://192.168.1.25:3000
   ```

4. A többi gépen böngészőből ezt a hálózati címet kell megnyitni:

   ```text
   http://192.168.1.25:3000/login.html
   ```

Ha a kliensgépek nem érik el a szervert, a szervergépen engedélyezni kell a bejövő TCP kapcsolatokat a `3000`-es portra a Windows tűzfalban vagy a céges tűzfalházirendben.
