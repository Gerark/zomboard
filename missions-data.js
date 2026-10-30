'use strict';

// Edit titles, descriptions, crew sizes and image paths here.
// Use image/imageAlt for one image, or images: [{ src, alt }, ...] for an ordered list.
const missions = [
  {
    id: 'bunker', number: '01', title: 'THE BUNKER MYSTERY',
    kicker: 'RECONNAISSANCE', category: 'field', risk: 'HIGH',
    images: [
      { src: 'assets/bunker-flyer.png', alt: 'In-game tour flyer for a decommissioned nuclear bunker in March Ridge, with directions and a labeled floor plan.' },
      { src: 'assets/bunker.png', alt: 'Annotated in-game map marking a possible bunker location in Knox County.' }
    ],
    location: 'Unknown bunker · Knox County', crew: '3 recommended / 1 stealth specialist',
    teaser: 'Could be full of supplies. Could be absolutely nothing. Only one way to find out.',
    description: 'Rumors of a bunker nearby. Maybe military supplies, maybe forgotten treasures, maybe three cans of beans and a dead rat. Get eyes on the entrance and find out whether it is worth the trip. Go in loud with a squad, or send one sneaky bastard to scout it out.',
    objectives: ['Locate the bunker entrance', 'Scout the surroundings and assess the risk', 'Bring back any valuable supplies — and preferably everyone who went in'],
    note: 'A solo run is for someone who can move quietly, not someone who thinks they can.'
  },
  {
    id: 'groceries', number: '02', title: 'THE PRICE OF GROCERIES',
    kicker: 'SUPPLY RUN', category: 'field', risk: 'SEVERE',
    images: [
      { src: 'assets/grocery-store.png', alt: 'Food Market grocery store exterior and parking lot.' },
      { src: 'assets/grocery.png', alt: 'Annotated map marking a canned-food location in Muldraugh and the McCoy safehouse.' }
    ],
    location: 'Grocery Store · Muldraugh', crew: '3 recommended / 2 if we are smart',
    teaser: 'The shelves might have food. The previous customers definitely never left.',
    description: 'The grocery store is crawling with zombies. Unfortunately, it is also crawling with the possibility of actual food. Assemble a squad, sweep the perimeter, clear the aisles and take everything useful before the local population notices the sale.',
    objectives: ['Clear a safe approach to the storefront', 'Sweep the store without getting surrounded', 'Bring home non-perishables and useful supplies'],
    note: 'No coupons accepted. No refunds. Do not split up in aisle three.'
  },
  {
    id: 'palisade', number: '03', title: 'FORTIFY McCOY',
    kicker: 'BASE CONSTRUCTION', category: 'base', risk: 'LOW',
    image: 'assets/palisade.png', imageAlt: 'The McCoy safehouse yard with a partially built wooden palisade.',
    location: 'Safehouse', crew: '1 contractor',
    teaser: 'Finish the palisade. Barricade the entrances. Keep the dead outside.',
    description: 'A fortress is only as strong as its weakest entrance. Complete the palisade, reinforce the external doors and barricade the vulnerable approaches. The only zombies allowed inside should be the ones we accidentally brought home.',
    objectives: ['Finish the perimeter palisade', 'Barricade every external entrance', 'Inspect the walls for gaps and weak points'],
    note: 'Our contractor has taken this job. Respect the craftsmanship.'
  },
  {
    id: 'coop', number: '04', title: 'OPERATION CLUCK FORTRESS',
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
    kicker: 'VEHICLE MAINTENANCE', category: 'base', risk: 'LOW',
    image: 'assets/mechanics.png', imageAlt: 'An overturned van beside a survivor in a parking lot.',
    location: 'Safehouse vehicle yard', crew: '1 mechanic minimum',
    teaser: 'Our vans are held together by hope, rust, and incredibly bad decisions.',
    description: 'We need someone with grease on their hands and a vague understanding of how engines work. Inspect our fleet, replace the worst parts, repair what can be repaired and make sure the vans start when the screaming begins.',
    objectives: ['Inspect vehicle condition and identify failing parts', 'Salvage or acquire replacement components', 'Repair and refuel the vans for future supply runs'],
    note: 'Kicking the tires is not a full mechanical inspection.'
  },
  {
    id: 'police', number: '07', title: 'THE SOUND OF FREEDOM',
    kicker: 'AMMUNITION & DRILLS', category: 'field', risk: 'SEVERE',
    images: [
      { src: 'assets/police-station.png', alt: 'Police station entrance with metal barriers and radio dishes on the roof.' },
      { src: 'assets/police.png', alt: 'Annotated map marking Muldraugh Police Station near Wilson Street.' }
    ],
    location: 'Muldraugh Police Station / Safehouse', crew: '3 survivors minimum',
    teaser: 'First we find bullets. Then we find out whether our walls actually work.',
    description: 'Our ammunition stash is looking sad. Raid the Muldraugh police station for supplies, then arrange a controlled test of our defenses back at McCoy. Lure a small group of zombies toward the base and practise holding the line. Emphasis on small.',
    objectives: ['Recover ammunition and useful police equipment', 'Prepare the safehouse firing positions', 'Conduct a controlled defense drill with a manageable horde'],
    note: 'This is a test of the defenses, not an invitation to attract half of Kentucky.'
  },
  {
    id: 'greenes', number: '08', title: 'GREEN THUMBS, RED STREETS',
    kicker: 'FARMING SUPPLIES', category: 'field', risk: 'MEDIUM',
    image: 'assets/greenes.png', imageAlt: 'A survivor outside Greene’s store, with a station wagon parked in front.',
    location: 'Muldraugh / surrounding farms and storage areas', crew: '1 survivor minimum',
    teaser: 'Greene’s was a dead end. Seb knew a farm, but never got the chance to show us.',
    description: 'Greene’s has been checked: no gardening materials, and especially no sacks. Seb knew about a farm he wanted to show us, but he died tragically before he could take us there. That farm is our next lead, if we can work out which one he meant. Its location and supplies still need confirming. Pick up the trail and keep sacks at the top of the shopping list so we can haul soil up to the rooftop garden. Bring back any useful seeds and gardening tools along the way.',
    outdatedLead: 'Search Greene’s for gardening supplies, tools and seeds.',
    relatedMission: 'seb',
    objectives: ['Try to identify the farm Seb wanted to show us and scout it for gardening supplies', 'Find and recover sacks for carrying soil to the rooftop garden', 'Collect any useful seeds and gardening tools still needed', 'Bring the supplies home for the rooftop project'],
    note: 'Seb’s farm is an unconfirmed lead. If it does not pan out, keep searching other farms, sheds and storage areas. Sacks first.'
  },
  {
    id: 'garden', number: '09', title: 'SALAD WITH A VIEW',
    kicker: 'FOOD PRODUCTION', category: 'base', risk: 'LOW',
    image: 'assets/rooftop-garden.png', imageAlt: 'The McCoy Logging Company rooftop and surrounding yard.',
    location: 'Safehouse rooftop', crew: '1 green-thumbed survivor minimum',
    teaser: 'A little greenery. A little hope. A beautiful view of the undead below.',
    description: 'Once the supplies arrive, turn the McCoy rooftop into our first proper garden. Fresh vegetables, a sustainable food source and one more excuse to stay home instead of visiting zombie-infested supermarkets.',
    objectives: ['Use the sacks from mission 08 to bring soil to the rooftop growing area', 'Set up the growing beds and an accessible water supply', 'Plant crops and organize ongoing maintenance'],
    note: 'Depends on sacks and farming supplies from mission 08; the search continues beyond Greene’s. Zombies may not harvest without permission.'
  },
  {
    id: 'vhs', number: '10', title: 'I MISS OLD MOVIES',
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
    kicker: 'RECOVERY & REMEMBRANCE', category: 'field', risk: 'HIGH',
    image: 'assets/cemetery.svg', imageAlt: 'A simple SVG illustration of Seb’s wooden grave marker, fresh earth and a shovel inside the safehouse fence.',
    location: 'Search area unconfirmed / Safehouse grounds', crew: '2 survivors recommended',
    teaser: 'Find Seb’s fallen survivor. Bring our friend home and give him a place to rest.',
    description: 'Seb’s survivor did not make it. He knew about a farm he wanted to show us for the gardening supply hunt, but died tragically before he got the chance. Find out where he fell and track him down. If he is still walking, put him down so we can bring him home for a proper burial. Set aside a quiet corner of the safehouse grounds for a cemetery, somewhere we can remember the people who helped us get this far.',
    relatedMission: 'greenes',
    objectives: ['Establish Seb’s last known location and search the area', 'Identify his fallen survivor and put him down if he has reanimated', 'Secure the area and recover his remains for burial', 'Prepare a small cemetery within the safehouse perimeter', 'Lay him to rest and mark his grave'],
    note: 'Bring a shovel. Bring backup. Bring our friend home.'
  },
  {
    id: 'winter', number: '14', title: 'WINTER IS COMING',
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
    kicker: 'BASE CONSTRUCTION', category: 'base', risk: 'LOW',
    image: 'assets/survivor-rooms.png', imageAlt: 'In-game screenshot of survivor rooms inside the safehouse, with unfinished timber wall frames around beds, desks and lockers.',
    location: 'Safehouse', crew: '1 contractor',
    teaser: 'Finish the survivor-room walls. A bed deserves more than an imaginary bedroom.',
    description: 'The beds, desks and lockers are already in place. The walls are still mostly a promise. Our contractor needs to finish the existing frames around the survivor rooms, leave proper doorways and make sure everyone can reach their bed without climbing over someone else’s desk. Privacy survived the apocalypse. It is just waiting for planks.',
    objectives: ['Gather the planks, nails and carpentry tools needed to finish the existing room frames', 'Build the remaining walls around each survivor room', 'Fit doors and keep the shared corridor and room entrances clear', 'Check every room is enclosed and its bed, desk and locker remain accessible'],
    note: 'Please keep the doorways. We asked for bedrooms, not decorative coffins.'
  },
  {
    id: 'battery-charger', number: '16', title: 'DEAD BATTERIES, LIVING PROBLEMS',
    kicker: 'BATTERY CHARGER RECOVERY', category: 'field', risk: 'MEDIUM',
    image: 'assets/battery-charger.png', imageAlt: 'A car battery charger with a front-panel gauge, coiled cables and red and blue clamps.',
    location: 'Knox County / Safehouse vehicle yard', crew: '2 survivors recommended',
    teaser: 'The cars need a charge. Pushing them home is getting old.',
    description: 'Find a car battery charger and bring it back to the safehouse. Search garages, workshops and storage areas for a lead; we do not have a confirmed location yet. Our cars are supposed to carry us away from trouble, not wait for a committee to push them. Recover a charger so we can recharge the fleet’s batteries and keep the next supply run from ending in a very slow getaway.',
    objectives: ['Search garages, workshops and storage areas for a car battery charger', 'Recover the charger and bring it back to the safehouse vehicle yard', 'Hand it over for recharging the cars’ batteries before future supply runs'],
    note: 'A motivational speech will not charge a battery. We have tried.'
  }
];
