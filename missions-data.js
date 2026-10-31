'use strict';

// Edit titles, descriptions, crew sizes and image paths here.
// Use image/imageAlt for one image, or images: [{ src, alt }, ...] for an ordered list.
const missions = [
  {
    id: 'bunker', number: '01', title: 'THE BUNKER MYSTERY',
    completed: true,
    kicker: 'RECONNAISSANCE', category: 'field', risk: 'HIGH',
    images: [
      { src: 'assets/bunker-flyer.png', alt: 'In-game tour flyer for a decommissioned nuclear bunker in March Ridge, with directions and a labeled floor plan.' },
      { src: 'assets/bunker.png', alt: 'Annotated in-game map marking a possible bunker location in Knox County.' }
    ],
    location: 'Bunker / supermarket · Knox County', crew: '3 recommended / 1 stealth specialist',
    teaser: 'The bunker had a few masks. The supermarket we spotted saved the supply run.',
    description: 'Mystery solved. The bunker held little more than a few masks for a nuclear crisis. Luckily, the team spotted a supermarket on the trip and came home with plenty of food and other useful supplies. The underground treasure hunt became a very successful shopping trip, taking the pressure off the separate grocery run.',
    relatedMission: 'groceries',
    objectives: ['Located and searched the bunker', 'Found a few masks for a nuclear crisis, with little else to recover', 'Spotted a supermarket and returned with a large haul of food and other supplies'],
    note: 'The bunker disappointed. The supermarket delivered. Mission 02 is now a reserve run if supplies start running low.'
  },
  {
    id: 'groceries', number: '02', title: 'THE PRICE OF GROCERIES',
    completed: false,
    kicker: 'RESERVE SUPPLY RUN', category: 'field', risk: 'SEVERE',
    images: [
      { src: 'assets/grocery-store.png', alt: 'Food Market grocery store exterior and parking lot.' },
      { src: 'assets/grocery.png', alt: 'Annotated map marking a canned-food location in Muldraugh and the McCoy safehouse.' }
    ],
    location: 'Grocery Store · Muldraugh', crew: '3 recommended / 2 if we are smart',
    teaser: 'The bunker crew filled the pantry. Keep this store in reserve for another day.',
    description: 'The supermarket haul during The Bunker Mystery brought home plenty of food and other supplies, so this separate grocery raid is no longer urgent and may not be needed for now. Keep the Muldraugh store as a reserve option. If stocks run low or something specific is missing, reassess what we need before risking a trip through its zombie-filled aisles.',
    relatedMission: 'bunker',
    objectives: ['Check safehouse stocks and decide whether another grocery run is needed', 'If needed, scout and clear a safe approach to the storefront', 'Recover missing food and useful supplies without getting surrounded'],
    note: 'Optional reserve run, not a confirmed clearance of this store. No need to die for groceries we already have.'
  },
  {
    id: 'palisade', number: '03', title: 'FORTIFY McCOY',
    completed: true,
    kicker: 'BASE CONSTRUCTION', category: 'base', risk: 'LOW',
    image: 'assets/palisade.png', imageAlt: 'The McCoy safehouse yard with a partially built wooden palisade.',
    location: 'Safehouse', crew: '1 contractor',
    teaser: 'Fortifications finished. McCoy has a perimeter worth respecting.',
    description: 'The fortification job is complete. The palisade and entrance defenses are in place, giving McCoy a proper perimeter between the living and the extremely persistent neighbors. The only zombies allowed inside should still be the ones we accidentally brought home.',
    objectives: ['Finished the perimeter palisade', 'Barricaded the external entrances', 'Checked the walls for gaps and weak points'],
    note: 'Our contractor has taken this job. Respect the craftsmanship.'
  },
  {
    id: 'coop', number: '04', title: 'OPERATION CLUCK FORTRESS',
    completed: false,
    kicker: 'BASE CONSTRUCTION', category: 'base', risk: 'LOW',
    image: 'assets/chicken-coop.png', imageAlt: 'Chickens on grass beside a small coop and a metal barrel.',
    location: 'Safehouse', crew: '1 survivor minimum',
    teaser: 'The apocalypse took civilization. Not our right to fresh eggs.',
    description: 'Establish our very own feathered fortress. Build a chicken house and a secure first fence so future residents have somewhere to sleep, eat, and silently judge us from. Make it cozy. Make it sturdy. Do not let the chickens run the place.',
    objectives: ['Choose a safe spot for the enclosure', 'Build a fence and chicken house', 'Prepare the area for incoming livestock'],
    note: 'Chickens are future coworkers. Please act professionally.'
  },
  {
    id: 'chickens', number: '05', title: 'THE GREAT CHICKEN HEIST',
    completed: false,
    kicker: 'LIVESTOCK RECOVERY', category: 'field', risk: 'MEDIUM',
    image: 'assets/chickens.png', imageAlt: 'Annotated map marking a possible chicken location near Muldraugh.',
    location: 'Farms around Knox County', crew: '2 survivors minimum',
    teaser: 'We have a coop to fill. Time to liberate some feathered survivors.',
    description: 'The coop is useless without tenants. Search nearby farms for chickens, secure them, and bring the little idiots back home alive. Remember: you are stealing chickens during a zombie apocalypse. Keep your priorities straight.',
    objectives: ['Locate a farm with living chickens', 'Find a safe way to transport them', 'Return to McCoy with livestock and all limbs intact'],
    note: 'The chickens must survive. You should make an effort as well.'
  },
  {
    id: 'mechanics', number: '06', title: 'PIMP MY APOCALYPSE RIDE',
    completed: true,
    kicker: 'VEHICLE MAINTENANCE', category: 'base', risk: 'LOW',
    image: 'assets/mechanics.png', imageAlt: 'An overturned van beside a survivor in a parking lot.',
    location: 'Safehouse vehicle yard', crew: '1 mechanic minimum',
    teaser: 'Found a truck. Then more cars. The fleet has become a parking problem.',
    description: 'This job ended with the team finding a truck, then picking up even more cars further down the road. Pimping the apocalypse ride turned into expanding the entire fleet. The vehicle job is complete; the growing collection still gives us plenty to keep an eye on before future runs.',
    objectives: ['Found a truck for the team', 'Added more cars to the fleet on later travels'],
    note: 'We asked for better transport. Apparently the answer was a growing parking problem.'
  },
  {
    id: 'police', number: '07', title: 'THE SOUND OF FREEDOM',
    completed: true,
    kicker: 'WEAPONS RECOVERED', category: 'field', risk: 'SEVERE',
    images: [
      { src: 'assets/police-station.png', alt: 'Police station entrance with metal barriers and radio dishes on the roof.' },
      { src: 'assets/police.png', alt: 'Annotated map marking Muldraugh Police Station near Wilson Street.' }
    ],
    location: 'Muldraugh Police Station / Safehouse', crew: '3 survivors minimum',
    teaser: 'A serious haul of guns, already put to use by the team on later runs.',
    description: 'The weapons run is complete. The team recovered a large haul of guns, and those firearms have already seen use on later outings. The Sound of Freedom turned out to have a very practical sequel: making sure the survivors had something to shoot with.',
    objectives: ['Recovered a large haul of firearms', 'Equipped the team with guns used on subsequent runs'],
    note: 'The guns did not stay on display. The team has already put the haul to work.'
  },
  {
    id: 'greenes', number: '08', title: 'GREEN THUMBS, RED STREETS',
    completed: true,
    kicker: 'FARMING SUPPLIES', category: 'field', risk: 'MEDIUM',
    image: 'assets/greenes.png', imageAlt: 'A survivor outside Greene’s store, with a station wagon parked in front.',
    location: 'Muldraugh / surrounding farms and storage areas', crew: '1 survivor minimum',
    teaser: 'Enough tools and seeds are home. Time to grow something that does not bite.',
    description: 'The farming supply hunt is complete. Greene’s came up empty, and Seb’s farm remains an unconfirmed lead. The team has since gathered enough agricultural tools and seeds to start growing food. The next job is putting the supplies to use. For once, dinner might grow closer to home than the nearest zombie-filled shop.',
    outdatedLead: 'Search Greene’s for gardening supplies, tools and seeds.',
    relatedMission: 'seb',
    objectives: ['Collected enough agricultural tools to start farming', 'Brought home enough seeds to begin planting'],
    note: 'Tools and seeds are ready for mission 09. Sacks for hauling rooftop soil are not confirmed; check the stockpile before planning the lift.'
  },
  {
    id: 'garden', number: '09', title: 'SALAD WITH A VIEW',
    completed: false,
    kicker: 'FOOD PRODUCTION', category: 'base', risk: 'LOW',
    image: 'assets/rooftop-garden.png', imageAlt: 'The McCoy Logging Company rooftop and surrounding yard.',
    location: 'Safehouse rooftop', crew: '1 green-thumbed survivor minimum',
    teaser: 'A little greenery. A little hope. A beautiful view of the undead below.',
    description: 'Mission 08 brought home enough agricultural tools and seeds to start farming. Turn the McCoy rooftop into our first proper garden: check whether we have sacks for hauling soil, prepare the growing area and put those supplies to work. Fresh vegetables, a sustainable food source and one more excuse to stay home instead of visiting zombie-infested supermarkets.',
    objectives: ['Check for sacks and source any still needed to bring soil to the rooftop growing area', 'Set up the growing beds and an accessible water supply', 'Plant the recovered seeds and organize ongoing maintenance'],
    note: 'The tools and seeds from mission 08 are ready. Confirm the sacks and rooftop setup before planting. Zombies may not harvest without permission.'
  },
  {
    id: 'vhs', number: '10', title: 'I MISS OLD MOVIES',
    completed: true,
    kicker: 'VHS COLLECTION', category: 'field', risk: 'MEDIUM',
    image: 'assets/vhs.png', imageAlt: 'A survivor beside a television displaying color bars.',
    location: 'Movie Store · Muldraugh', crew: '2 survivors recommended',
    teaser: 'The world ended. Movie night did not. Bring the VHS collection home.',
    description: 'Raid the movie store in Muldraugh and collect its VHS tapes for the safehouse. Sweep the shop, check the shelves and storage areas, then bring the collection back to McCoy. A quiet evening in front of the TV beats another evening counting canned beans.',
    objectives: ['Reach the movie store and secure a safe route inside', 'Collect VHS tapes from the shelves and storage areas', 'Return the tapes to McCoy and organize the collection'],
    note: 'Late fees have been suspended indefinitely. Getting bitten still carries a penalty.'
  },
  {
    id: 'dumbbell', number: '11', title: 'OPERATION DUMBBELL',
    completed: false,
    kicker: 'GYM SUPPLY RUN', category: 'field', risk: 'MEDIUM',
    image: 'assets/dumbbell.png', imageAlt: 'A survivor beside a treadmill and a weight bench with a barbell indoors.',
    location: 'Gyms · Muldraugh / surrounding towns', crew: '2 survivors + cargo vehicle recommended',
    teaser: 'Running for your life counts as cardio. We could use some strength training.',
    description: 'McCoy needs a gym corner. Apparently hauling logs and sprinting from the neighbors does not count as a balanced routine. Find a gym leaflet or brochure to locate a promising gym in Muldraugh or another town, scout the place, and bring home dumbbells, barbells and any portable training gear worth the space. Sweep the shelves for energy drinks and granola bars, then turn a corner of the safehouse into somewhere we can lift things on purpose.',
    objectives: ['Find a gym leaflet or brochure and mark a location in Muldraugh or another town', 'Scout the gym and secure a safe approach and loading route', 'Recover dumbbells, barbells, portable gym equipment, energy drinks and granola bars', 'Haul the supplies back to McCoy and set up a dedicated workout area'],
    note: 'Bring a vehicle with cargo space. A personal best is less impressive if you cannot carry it home.'
  },
  {
    id: 'drag-race', number: '12', title: 'FAMILY, FUEL & FIRST AID',
    completed: false,
    kicker: 'VEHICLE RECOVERY', category: 'field', risk: 'HIGH',
    image: 'assets/drag-race.png', imageAlt: 'A survivor beside a damaged white sports car in a workshop.',
    location: 'Knox County / highway', crew: '2 drivers + mechanic recommended',
    teaser: 'One fast car is already home. Find it a rival. The highway is calling.',
    description: 'One fast car has already made it back to the safehouse. Unfortunately, a drag race requires a second terrible idea on wheels. Search for another fast car, check its condition, and bring it home so we can get both rides ready for a highway showdown. No specific model or location to go on. Just find something worth lining up beside the car we already have.',
    objectives: ['Find another fast car to race against the one already at the safehouse', 'Inspect the engine, tires and brakes, then recover the car to the safehouse', 'Get both cars running and fueled for the race', 'Scout a clear stretch of highway with room to race and stop'],
    note: 'Someone promised NOS. Someone else requested suture needles and med packs. Please settle the second request first.'
  },
  {
    id: 'seb', number: '13', title: 'A PROPER GOODBYE',
    completed: true,
    kicker: 'REMEMBRANCE', category: 'field', risk: 'HIGH',
    image: 'assets/cemetery.svg', imageAlt: 'Memorial illustration of a wooden marker bearing Seb’s name, earth and a shovel inside a fence; not a record of a safehouse burial.',
    location: 'Away from the safehouse', crew: '2 survivors recommended',
    teaser: 'Seb’s own player put his fallen survivor to rest. The body stayed out there.',
    description: 'Seb’s story has its ending. The same player who played Seb put his fallen survivor down and brought the ordeal to a close. His body was not brought back to the safehouse, but his final goodbye is complete. We will remember the friend who wanted to show us a farm and never got the chance.',
    relatedMission: 'greenes',
    objectives: ['Put Seb’s fallen survivor down, with Seb’s own player handling the final goodbye'],
    note: 'The cemetery illustration is a memorial. Seb’s body was not brought home for burial.'
  },
  {
    id: 'winter', number: '14', title: 'WINTER IS COMING',
    completed: false,
    kicker: 'WINTER PREPARATION', category: 'base', risk: 'MEDIUM',
    image: 'assets/winter-stove.svg', imageAlt: 'A simple SVG illustration of a wood stove, stacked logs and a bed in a small timber room, with snow outside the window.',
    location: 'Knox County / Safehouse', crew: '2 haulers + 1 builder recommended',
    teaser: 'Retrieve a stove, build smaller rooms and give winter a reason to stay outside.',
    description: 'The safehouse has plenty of space. Unfortunately, most of it will be cold. Find a wood stove, work out how to move it and bring it home before winter arrives. Partition the open interior into smaller enclosed rooms so we have manageable spaces to heat, then set up a warm refuge and a fuel reserve. Test the arrangement before the first freeze makes the decisions for us.',
    objectives: ['Locate a recoverable wood stove and prepare the tools and transport needed', 'Retrieve the stove and bring it back to the safehouse', 'Partition smaller enclosed rooms with doors to create spaces we can heat', 'Install the stove in the chosen room and stockpile suitable fuel', 'Test the heating setup and prepare the warm rooms for winter'],
    note: 'A giant warehouse is an ambitious thing to heat. Start with a room. Preferably before our water bottles become furniture.'
  },
  {
    id: 'survivor-rooms', number: '15', title: 'WALLS BETWEEN FRIENDS',
    completed: false,
    kicker: 'BASE CONSTRUCTION', category: 'base', risk: 'LOW',
    image: 'assets/survivor-rooms.png', imageAlt: 'In-game screenshot of survivor rooms inside the safehouse, with unfinished timber wall frames around beds, desks and lockers.',
    location: 'Safehouse', crew: '1 contractor',
    teaser: 'Walls done. Doors still missing. Privacy is almost a real feature.',
    description: 'The survivor-room walls are finished, so this job is partially complete. The remaining task is to fit doors if possible. Check the existing openings and available materials, preserve access to the shared corridor, beds, desks and lockers, and give everyone a way to close their room without moving a wardrobe into the doorway.',
    objectives: ['Check the existing doorways and what is needed to fit doors', 'Gather any missing materials and fit doors where possible', 'Keep the shared corridor clear and every bed, desk and locker accessible'],
    note: 'Partially complete; this quest stays active for the doors. Please finish the bedrooms without turning them into decorative coffins.'
  },
  {
    id: 'battery-charger', number: '16', title: 'DEAD BATTERIES, LIVING PROBLEMS',
    completed: false,
    kicker: 'BATTERY CHARGER RECOVERY', category: 'field', risk: 'MEDIUM',
    image: 'assets/battery-charger.png', imageAlt: 'A car battery charger with a front-panel gauge, coiled cables and red and blue clamps.',
    location: 'Knox County / Safehouse vehicle yard', crew: '2 survivors recommended',
    teaser: 'The cars need a charge. Pushing them home is getting old.',
    description: 'Find a car battery charger and bring it back to the safehouse. Search garages, workshops and storage areas for a lead; we do not have a confirmed location yet. Our cars are supposed to carry us away from trouble, not wait for a committee to push them. Recover a charger so we can recharge the fleet’s batteries and keep the next supply run from ending in a very slow getaway.',
    objectives: ['Search garages, workshops and storage areas for a car battery charger', 'Recover the charger and bring it back to the safehouse vehicle yard', 'Hand it over for recharging the cars’ batteries before future supply runs'],
    note: 'A motivational speech will not charge a battery. We have tried.'
  }
];
