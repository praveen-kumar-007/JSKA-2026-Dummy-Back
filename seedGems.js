const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const ChampionPlayer = require('./models/ChampionPlayer');
const Referee = require('./models/Referee');

dotenv.config();

const players = [
  // National Players
  { name: 'Mithun Mahto', category: 'National Player', gender: 'Male' },
  { name: 'Devangan Raj', category: 'National Player', gender: 'Male' },
  { name: 'Sristi Singh', category: 'National Player', gender: 'Female' },
  { name: 'Muskan Gupta', category: 'National Player', gender: 'Female' },
  { name: 'Vivek Kumar', category: 'National Player', gender: 'Male' },
  { name: 'Soni Kumari', category: 'National Player', gender: 'Female' },
  { name: 'Nayan Kumar', category: 'National Player', gender: 'Male' },
  { name: 'Riya Kumari', category: 'National Player', gender: 'Female' },
  { name: 'Praveen Kumar', category: 'National Player', gender: 'Male' },
  
  // Federation Cup
  { name: 'Sristi Singh', category: 'Federation Cup', gender: 'Female' },
  
  // Jharkhand Premier League
  { name: 'Muskan Gupta', category: 'Jharkhand Premier League', gender: 'Female' },
  { name: 'Reena Soren', category: 'Jharkhand Premier League', gender: 'Female' },
  { name: 'Gudiya Mahto', category: 'Jharkhand Premier League', gender: 'Female' },
  { name: 'Sristi Singh', category: 'Jharkhand Premier League', gender: 'Female' },
];

const referees = [
  { name: 'Mintoo Thakur', qualification: 'NIS KABADDI' },
  { name: 'Rajiv Srivastav', qualification: 'BPED' },
  { name: 'Pappu Yadav', qualification: 'BPED' },
  { name: 'Niranjan Mahto', qualification: 'BPED' },
  { name: 'Maan Singh', qualification: 'MPED' },
  { name: 'Dinesh Mahto', qualification: 'NATIONAL PLAYER' },
  { name: 'Mithun Mahto', qualification: 'NATIONAL PLAYER' },
  { name: 'Dipak Kumar', qualification: 'STATE PLAYER' },
  { name: 'Arun Yadav', qualification: 'STATE PLAYER' },
  { name: 'Pushpa Kumari', qualification: 'NATIONAL PLAYER' },
  { name: 'Praveen Kumar', qualification: 'NATIONAL PLAYER' },
];

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await ChampionPlayer.deleteMany({});
    await Referee.deleteMany({});
    console.log('Cleared existing data');

    // Insert new data
    await ChampionPlayer.insertMany(players);
    await Referee.insertMany(referees);
    
    console.log('✅ Database seeded successfully!');
    console.log(`✅ Added ${players.length} players`);
    console.log(`✅ Added ${referees.length} referees`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
