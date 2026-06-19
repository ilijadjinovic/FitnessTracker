// ===== PARTS — grupe mišića =====
const PARTS = ['Grudi','Leđa','Ramena','Biceps','Triceps','Noge','Stomak','Kardio','Celo telo'];

// ===== DEX — baza vežbi =====
// amp    = amplituda pokreta u metrima (za sKcal mehanicki rad)
// bw     = true ako je vežba sa sopstvenom telesnom težinom (bodyweight)
// bwFrac = procenat telesne težine koji vežba realno pokreće (samo za bw:true; fallback 0.65 ako nije zadat)
//          npr. 0.65-0.70 za vežbe gde se diže skoro celo telo (zgib, dips, sklek)
//          0.25-0.35 za vežbe gde se diže samo deo tela (noge kod rimske stolice, trup kod trbušnjaka)
// met    = MET vrednost (samo za kardio vežbe, za kKcal)
const DEX = [
  {id:'e1', name:'Bench press',                part:'Grudi',   amp:0.40, bw:false},
  {id:'e2', name:'Kosi bench press',           part:'Grudi',   amp:0.40, bw:false},
  {id:'e3', name:'Čučnjevi',                  part:'Noge',    amp:0.55, bw:false},
  {id:'e4', name:'Mrtvo dizanje',              part:'Leđa',    amp:0.55, bw:false},
  {id:'e5', name:'Potisak iznad glave',        part:'Ramena',  amp:0.45, bw:false},
  {id:'e6', name:'Biceps curl',                part:'Biceps',  amp:0.35, bw:false},
  {id:'e7', name:'Triceps extension',          part:'Triceps', amp:0.35, bw:false},
  {id:'e8', name:'Plank',                      part:'Stomak',  amp:0.10, bw:true, bwFrac:0.20},
  {id:'e9', name:'Trčanje',                   part:'Kardio',  met:9.0 },
  {id:'e10',name:'Veslanje',                  part:'Leđa',    amp:0.45, bw:false},
  {id:'e11',name:'Leg press',                 part:'Noge',    amp:0.45, bw:false},
  {id:'e12',name:'Dips',                      part:'Triceps', amp:0.40, bw:true, bwFrac:0.65},
  {id:'e13',name:'Lateral raises',            part:'Ramena',  amp:0.35, bw:false},
  {id:'e14',name:'Pull-up',                   part:'Leđa',    amp:0.45, bw:true, bwFrac:0.70},
  {id:'e15',name:'Sklekovi',                  part:'Grudi',   amp:0.35, bw:true, bwFrac:0.60},
  {id:'e16',name:'Bicikl',                    part:'Kardio',  met:7.5 },
  {id:'e17',name:'Eliptični trenažer',        part:'Kardio',  met:6.0 },
  {id:'e18',name:'Plivanje',                  part:'Kardio',  met:8.0 },

  // ===== Stomak (trbušnjaci) =====
  {id:'e19',name:'Kosa klupa (trbušnjaci)',   part:'Stomak',  amp:0.38, bw:true, bwFrac:0.30},
  {id:'e20',name:'Rimska/kapetanska stolica', part:'Stomak',  amp:0.50, bw:true, bwFrac:0.30},
  {id:'e21',name:'Trbušnjaci (crunch)',       part:'Stomak',  amp:0.20, bw:true, bwFrac:0.25},
  {id:'e22',name:'Ruski obrtaji (Russian twist)',part:'Stomak',amp:0.30, bw:true, bwFrac:0.30},
  {id:'e23',name:'Podizanje nogu u visu',     part:'Stomak',  amp:0.55, bw:true, bwFrac:0.30},
  {id:'e24',name:'Hanging knee raise',        part:'Stomak',  amp:0.40, bw:true, bwFrac:0.25},
  {id:'e25',name:'Cable crunch (uže)',        part:'Stomak',  amp:0.25, bw:false},
  {id:'e26',name:'Ab wheel rollout',          part:'Stomak',  amp:0.50, bw:true, bwFrac:0.35},

  // ===== Noge — primicači/odmicači (adduktori/abduktori) =====
  {id:'e27',name:'Adductor mašina (primicači)',part:'Noge',   amp:0.35, bw:false},
  {id:'e28',name:'Abductor mašina (odmicači)', part:'Noge',   amp:0.35, bw:false},
  {id:'e29',name:'Cable hip adduction',        part:'Noge',   amp:0.40, bw:false},
  {id:'e30',name:'Cable hip abduction',        part:'Noge',   amp:0.40, bw:false},
  {id:'e31',name:'Sumo čučanj',               part:'Noge',    amp:0.50, bw:false},

  // ===== Noge — ostalo =====
  {id:'e32',name:'Bugarski split čučanj',     part:'Noge',    amp:0.45, bw:true, bwFrac:0.55},
  {id:'e33',name:'Iskoraci (lunges)',         part:'Noge',    amp:0.45, bw:true, bwFrac:0.55},
  {id:'e34',name:'Leg extension',             part:'Noge',    amp:0.35, bw:false},
  {id:'e35',name:'Leg curl',                  part:'Noge',    amp:0.30, bw:false},
  {id:'e36',name:'Rumunsko mrtvo dizanje',    part:'Noge',    amp:0.40, bw:false},
  {id:'e37',name:'Podizanje na prste (calf raise)',part:'Noge',amp:0.12, bw:true, bwFrac:0.90},
  {id:'e38',name:'Hip thrust',                part:'Noge',    amp:0.30, bw:false},

  // ===== Leđa — gornja/donja =====
  {id:'e39',name:'Lat pulldown (gornja leđa)',part:'Leđa',    amp:0.45, bw:false},
  {id:'e40',name:'Veslanje uz telo (donja leđa)',part:'Leđa', amp:0.35, bw:false},
  {id:'e41',name:'Hiperekstenzije (donja leđa)',part:'Leđa',  amp:0.30, bw:true, bwFrac:0.40},
  {id:'e42',name:'Pull-over',                 part:'Leđa',    amp:0.40, bw:false},
  {id:'e43',name:'Face pull (gornja leđa)',   part:'Leđa',    amp:0.35, bw:false},
  {id:'e44',name:'Shrugs (trapez)',           part:'Leđa',    amp:0.15, bw:false},
  {id:'e45',name:'T-bar veslanje',            part:'Leđa',    amp:0.40, bw:false},

  // ===== Ramena — dopuna =====
  {id:'e46',name:'Front raise',               part:'Ramena',  amp:0.40, bw:false},
  {id:'e47',name:'Rear delt fly (zadnja ramena)',part:'Ramena',amp:0.35, bw:false},
  {id:'e48',name:'Arnold press',              part:'Ramena',  amp:0.45, bw:false},
  {id:'e49',name:'Upright row',               part:'Ramena',  amp:0.30, bw:false},

  // ===== Grudi — dopuna =====
  {id:'e50',name:'Pec deck (butterfly)',      part:'Grudi',   amp:0.35, bw:false},
  {id:'e51',name:'Sklopke (cable fly)',       part:'Grudi',   amp:0.40, bw:false},
  {id:'e52',name:'Sklekovi na rukohvatima',   part:'Grudi',   amp:0.40, bw:true, bwFrac:0.62},

  // ===== Biceps/Triceps — dopuna =====
  {id:'e53',name:'Hammer curl',               part:'Biceps',  amp:0.35, bw:false},
  {id:'e54',name:'Preacher curl',             part:'Biceps',  amp:0.35, bw:false},
  {id:'e55',name:'Triceps pushdown (uže/šipka)',part:'Triceps',amp:0.35, bw:false},
  {id:'e56',name:'Skull crusher',             part:'Triceps', amp:0.30, bw:false},

  // ===== Kardio — dopuna =====
  {id:'e57',name:'Veslački trenažer (rowing)',part:'Kardio',  met:7.0 },
  {id:'e58',name:'Skakanje konopca',          part:'Kardio',  met:11.0 },
  {id:'e59',name:'Penjanje uz stepenice',     part:'Kardio',  met:8.5 },

  // ===== Celo telo =====
  {id:'e60',name:'Burpees',                   part:'Celo telo',amp:0.55, bw:true, bwFrac:0.65},
  {id:'e61',name:'Kettlebell swing',          part:'Celo telo',amp:0.50, bw:false},
  {id:'e62',name:'Farmers walk',              part:'Celo telo',amp:0.05, bw:false}
];
