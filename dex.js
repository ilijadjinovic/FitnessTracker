// ===== PARTS — grupe mišića =====
const PARTS = ['Grudi','Leđa','Ramena','Biceps','Triceps','Noge','Stomak','Kardio','Celo telo'];

// ===== DEX — baza vežbi =====
// amp = amplituda pokreta u metrima (za sKcal mehanicki rad)
// bw  = true ako je vežba sa sopstvenom telesnom težinom (bodyweight)
// met = MET vrednost (samo za kardio vežbe, za kKcal)
const DEX = [
  {id:'e1', name:'Bench press',            part:'Grudi',   amp:0.40, bw:false},
  {id:'e2', name:'Kosi bench press',       part:'Grudi',   amp:0.40, bw:false},
  {id:'e3', name:'Čučnjevi',              part:'Noge',    amp:0.55, bw:false},
  {id:'e4', name:'Mrtvo dizanje',          part:'Leđa',    amp:0.55, bw:false},
  {id:'e5', name:'Potisak iznad glave',    part:'Ramena',  amp:0.45, bw:false},
  {id:'e6', name:'Biceps curl',            part:'Biceps',  amp:0.35, bw:false},
  {id:'e7', name:'Triceps extension',      part:'Triceps', amp:0.35, bw:false},
  {id:'e8', name:'Plank',                  part:'Stomak',  amp:0.10, bw:true },
  {id:'e9', name:'Trčanje',               part:'Kardio',  met:9.0 },
  {id:'e10',name:'Veslanje',              part:'Leđa',    amp:0.45, bw:false},
  {id:'e11',name:'Leg press',             part:'Noge',    amp:0.45, bw:false},
  {id:'e12',name:'Dips',                  part:'Triceps', amp:0.40, bw:true },
  {id:'e13',name:'Lateral raises',        part:'Ramena',  amp:0.35, bw:false},
  {id:'e14',name:'Pull-up',               part:'Leđa',    amp:0.45, bw:true },
  {id:'e15',name:'Sklekovi',              part:'Grudi',   amp:0.35, bw:true },
  {id:'e16',name:'Bicikl',               part:'Kardio',  met:7.5 },
  {id:'e17',name:'Eliptični trenažer',    part:'Kardio',  met:6.0 },
  {id:'e18',name:'Plivanje',             part:'Kardio',  met:8.0 }
];
