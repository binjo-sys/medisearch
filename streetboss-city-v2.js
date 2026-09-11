// STREET BOSS city systems module — NPCs, cars, missions, collectibles and day/night.
// Loaded by game.html in the next integration step.
const STREET_BOSS_CITY_SYSTEMS = {
  version: 2,
  missionTypes: [
    { id:'delivery', name:'FAST DELIVERY', reward:500, rep:8, energy:12 },
    { id:'pickup', name:'STREET PICKUP', reward:350, rep:6, energy:10 },
    { id:'business', name:'BUSINESS RUN', reward:700, rep:12, energy:15 }
  ],
  districts: [
    { id:'cbd', name:'CBD', unlockRep:0 },
    { id:'eastlands', name:'EASTLANDS', unlockRep:40 },
    { id:'westlands', name:'WESTLANDS', unlockRep:100 },
    { id:'industrial', name:'INDUSTRIAL AREA', unlockRep:180 }
  ]
};
