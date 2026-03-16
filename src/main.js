import './style.css'
import Phaser from 'phaser';
import config from './config.js';
import GameScene from './GameScene.js';

// Add assets to config
config.scene = [GameScene];

// Start the game
const game = new Phaser.Game(config);