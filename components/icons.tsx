import React from 'react';
import { BuildingType, UnitType } from '../types';
import {
  FaQuestion,
  FaHardHat,
} from 'react-icons/fa';
import {
  GiRifle,
  GiTeslaCoil,
  GiTank,
  GiPrism,
  GiBattleTank,
  GiJetpack,
  GiJetFighter,
  GiZeppelin,
  GiBattleship,
  GiSpeedBoat,
  GiMineWagon,
  GiVortex,
  GiNuclearBomb,
  // Available in v5.2.1:
  GiRadarDish,        // HQ
  GiPowerGenerator,   // Power Plant
  GiOilDrum,          // Refinery
  GiBarracksTent,     // Barracks
  GiFactory,          // War Factory
  GiAirplane,         // Airfield
  GiShipBow,          // Naval Yard
  GiCarWheel,         // Repair Bay
  GiTankTread,        // Prism Tank
  GiSailboat,         // Sea Scorpion
  GiMechanicalArm,    // Engineer
  GiMissileLauncher,  // Nuclear Silo
  GiTwoCoins,         // Credits Icon
  GiLightningStorm,   // Power Icon
} from 'react-icons/gi';

export const CreditsIcon = () => (
    <div className="w-full h-full text-yellow-400">
        <GiTwoCoins className="w-full h-full" />
    </div>
);

export const PowerIcon = () => (
    <div className="w-full h-full text-cyan-400">
        <GiLightningStorm className="w-full h-full" />
    </div>
);

export const EntityIcon = ({ type, size = '10' }: { type: BuildingType | UnitType; size?: string }) => {
  const containerClass = `w-${size} h-${size} flex items-center justify-center font-bold text-white`;

  let IconComponent: React.ElementType;
  let bgClass: string;
  let borderClass: string;
  let shapeClass: string;

  switch (type) {
    // Buildings
    case BuildingType.HQ:
      IconComponent = GiRadarDish;
      bgClass = 'bg-blue-600';
      borderClass = 'border-blue-300';
      shapeClass = 'rounded-sm';
      break;

    case BuildingType.POWER_PLANT:
      IconComponent = GiPowerGenerator;
      bgClass = 'bg-yellow-600';
      borderClass = 'border-yellow-300';
      shapeClass = 'rounded-sm';
      break;

    case BuildingType.REFINERY:
      IconComponent = GiOilDrum;
      bgClass = 'bg-green-700';
      borderClass = 'border-green-400';
      shapeClass = 'rounded-sm';
      break;

    case BuildingType.BARRACKS:
      IconComponent = GiBarracksTent;
      bgClass = 'bg-gray-600';
      borderClass = 'border-gray-300';
      shapeClass = 'rounded-sm';
      break;

    case BuildingType.WAR_FACTORY:
      IconComponent = GiFactory;
      bgClass = 'bg-red-800';
      borderClass = 'border-red-500';
      shapeClass = 'rounded-sm';
      break;

    case BuildingType.AIRFIELD:
      IconComponent = GiAirplane;
      bgClass = 'bg-sky-600';
      borderClass = 'border-sky-300';
      shapeClass = 'rounded-sm';
      break;

    case BuildingType.NAVAL_YARD:
      IconComponent = GiShipBow;
      bgClass = 'bg-indigo-600';
      borderClass = 'border-indigo-300';
      shapeClass = 'rounded-sm';
      break;
    
    case BuildingType.REPAIR_BAY:
      IconComponent = GiCarWheel;
      bgClass = 'bg-orange-600';
      borderClass = 'border-orange-300';
      shapeClass = 'rounded-sm';
      break;

    case BuildingType.CHRONO_SPHERE:
      IconComponent = GiVortex;
      bgClass = 'bg-purple-700';
      borderClass = 'border-purple-400';
      shapeClass = 'rounded-sm';
      break;

    case BuildingType.NUCLEAR_MISSILE_SILO:
      IconComponent = GiMissileLauncher;
      bgClass = 'bg-red-900';
      borderClass = 'border-yellow-400';
      shapeClass = 'rounded-sm';
      break;

    // Units
    case UnitType.RIFLEMAN:
      IconComponent = GiRifle;
      bgClass = 'bg-gray-500';
      borderClass = 'border-gray-200';
      shapeClass = 'rounded-full';
      break;
    
    case UnitType.ENGINEER:
      IconComponent = GiMechanicalArm;
      bgClass = 'bg-orange-500';
      borderClass = 'border-orange-200';
      shapeClass = 'rounded-full';
      break;

    case UnitType.TESLA_TROOPER:
      IconComponent = GiTeslaCoil;
      bgClass = 'bg-blue-500';
      borderClass = 'border-blue-200';
      shapeClass = 'rounded-full';
      break;

    case UnitType.TANK:
      IconComponent = GiTank;
      bgClass = 'bg-red-700';
      borderClass = 'border-red-400';
      shapeClass = 'rounded-md';
      break;

    case UnitType.PRISM_TANK:
      IconComponent = GiTankTread;
      bgClass = 'bg-cyan-500';
      borderClass = 'border-cyan-200';
      shapeClass = 'rounded-md';
      break;

    case UnitType.APOCALYPSE_TANK:
      IconComponent = GiBattleTank;
      bgClass = 'bg-black';
      borderClass = 'border-gray-400';
      shapeClass = 'rounded-md';
      break;
    
    case UnitType.CHRONO_MINER:
      IconComponent = GiMineWagon;
      bgClass = 'bg-yellow-800';
      borderClass = 'border-yellow-500';
      shapeClass = 'rounded-md';
      break;

    case UnitType.ROCKETEER:
      IconComponent = GiJetpack;
      bgClass = 'bg-zinc-400';
      borderClass = 'border-zinc-100';
      shapeClass = 'rounded-full';
      break;

    case UnitType.FIGHTER_JET:
      IconComponent = GiJetFighter;
      bgClass = 'bg-sky-500';
      borderClass = 'border-sky-200';
      shapeClass = 'rounded-lg';
      break;

    case UnitType.KIROV_AIRSHIP:
      IconComponent = GiZeppelin;
      bgClass = 'bg-red-900';
      borderClass = 'border-red-600';
      shapeClass = 'rounded-full';
      break;

    case UnitType.DESTROYER:
      IconComponent = GiBattleship;
      bgClass = 'bg-indigo-500';
      borderClass = 'border-indigo-200';
      shapeClass = 'rounded-sm';
      break;

    case UnitType.SEA_SCORPION:
      IconComponent = GiSailboat;
      bgClass = 'bg-teal-500';
      borderClass = 'border-teal-200';
      shapeClass = 'rounded-sm';
      break;

    default:
      IconComponent = FaQuestion;
      bgClass = 'bg-purple-500';
      borderClass = 'border-purple-300';
      shapeClass = 'rounded-md';
      break;
  }

  return (
    <div className={`${containerClass} ${bgClass} ${borderClass} ${shapeClass} border-2`}>
      <IconComponent className="w-full h-full p-1" />
    </div>
  );
};