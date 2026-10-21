'use strict';
// Demo data: only inserted when the listings table is empty and SEED=1 (or run `npm run seed`).
const { db, tx } = require('./db');

const SELLERS = [
  'Lemayian','Mwenda','Mutinda','Halima','Mutua','Wekesa','Kamau','Naserian','Wanjiru','Moraa','Chebet','Ole Sankale',
  'Musyoka','Njeri','Parsimei','Ekai','Kinoti','Abdi','Wambui','Saitoti','Ntimama','Kioko','Nafula','Mwikali','Karanja','Gitonga'
];
// animal, breed, sex, size, price, county, qty, verified, vaccinated, seller
const ROWS = [
  ['cattle','Boran bull','m',2,85000,'Kajiado',1,1,1,'Lemayian'],
  ['cattle','Friesian heifer, in calf','f',1,120000,'Meru',1,1,1,'Mwenda'],
  ['cattle','Sahiwal cow','f',1,95000,'Makueni',1,1,1,'Mutinda'],
  ['goat','Galla does','f',1,9500,'Garissa',6,1,1,'Halima'],
  ['goat','Toggenburg doe','f',1,18000,'Machakos',1,0,1,'Mutua'],
  ['goat','Boer buck','m',2,22000,'Kakamega',1,1,1,'Wekesa'],
  ['sheep','Dorper ram','m',2,14000,'Nakuru',1,0,1,'Kamau'],
  ['sheep','Red Maasai ewes','f',1,8000,'Narok',5,1,1,'Naserian'],
  ['chicken','Kienyeji hens','f',1,900,'Kiambu',10,1,0,'Wanjiru'],
  ['chicken','Kienyeji cock','m',2,1500,'Kisii',1,0,0,'Moraa'],
  ['cattle','Ayrshire cow, milking','f',1,105000,'Nakuru',1,1,1,'Chebet'],
  ['cattle','Boran steers','m',2,68000,'Narok',3,1,1,'Ole Sankale'],
  ['cattle','Zebu heifer','f',0,42000,'Machakos',1,0,0,'Musyoka'],
  ['cattle','Jersey cross cow','f',1,88000,'Kiambu',1,0,1,'Njeri'],
  ['goat','Kalahari Red buck','m',2,25000,'Kajiado',1,1,1,'Parsimei'],
  ['goat','Small East African kids','f',0,4500,'Turkana',8,0,0,'Ekai'],
  ['goat','Saanen dairy doe','f',1,30000,'Meru',1,1,1,'Kinoti'],
  ['goat','Galla bucks','m',2,12000,'Garissa',4,0,1,'Abdi'],
  ['sheep','Dorper ewes, in lamb','f',1,16000,'Nakuru',4,1,1,'Wambui'],
  ['sheep','Blackhead Persian ram','m',2,17000,'Kajiado',1,0,1,'Saitoti'],
  ['sheep','Red Maasai lambs','m',0,5500,'Narok',6,1,0,'Ntimama'],
  ['sheep','Hair sheep ewe','f',1,9000,'Makueni',2,0,0,'Kioko'],
  ['chicken','Kuroiler hens','f',1,1100,'Kakamega',12,1,1,'Nafula'],
  ['chicken','Improved kienyeji chicks','f',0,150,'Machakos',50,1,1,'Mwikali'],
  ['chicken','Sasso cockerels','m',1,1300,'Kiambu',8,0,0,'Karanja'],
  ['chicken','Turkeys, pair','f',2,7500,'Meru',2,0,0,'Gitonga']
];

function seed() {
  const n = db.prepare('SELECT COUNT(*) n FROM listings').get().n;
  if (n > 0) return 0;
  const now = Date.now();
  const DAY = 86400000;
  tx(() => {
    const insU = db.prepare('INSERT INTO users(phone,name,created_at) VALUES (?,?,?)');
    const ids = {};
    SELLERS.forEach((name, i) => {
      // clearly fake numbers (+254700000xxx): replaced by real sellers as they sign up
      const phone = '+254700000' + String(100 + i);
      ids[name] = Number(insU.run(phone, name, now).lastInsertRowid);
    });
    const insL = db.prepare(`INSERT INTO listings
      (user_id,animal,breed,sex,size,price,quantity,county,verified,vaccinated,created_at,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    ROWS.forEach((r, i) => {
      const created = now - i * 3600000 * 5;
      insL.run(ids[r[9]], r[0], r[1], r[2], r[3], r[4], r[6], r[5], r[7], r[8], created, created + 60 * DAY);
    });
  });
  return ROWS.length;
}

module.exports = { seed };
if (require.main === module) console.log(`Seeded ${seed()} demo listings`);
