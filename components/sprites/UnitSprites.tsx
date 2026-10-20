import React from 'react';
import { UnitType } from '../../types';
import { Palette } from './palette';

// Every sprite is drawn in a 64x64 box, facing up (north). Colours: `c.base` is the team colour.

const Tracks = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
    <g>
        <rect x={x} y={y} width={w} height={h} rx={3} fill="#1d2125" />
        {Array.from({ length: Math.floor(h / 4) }, (_, i) => (
            <line key={i} x1={x + 1} x2={x + w - 1} y1={y + 3 + i * 4} y2={y + 3 + i * 4} stroke="#434a52" strokeWidth={1.4} />
        ))}
        <rect x={x} y={y} width={w} height={h} rx={3} fill="none" stroke="#0c0e10" strokeWidth={1} />
    </g>
);

const Infantry = ({ c, children, helmet = '#59622c' }: { c: Palette; children?: React.ReactNode; helmet?: string }) => (
    <g>
        {/* shoulders and arms */}
        <ellipse cx={32} cy={38} rx={13} ry={8} fill={c.dark} />
        <ellipse cx={32} cy={37} rx={11.5} ry={7} fill={c.base} />
        <path d="M21 37 q11 -8 22 0" fill="none" stroke={c.light} strokeWidth={1.2} opacity={0.7} />
        {/* helmet */}
        <circle cx={32} cy={33} r={7} fill="#1b1d12" />
        <circle cx={32} cy={32.5} r={6} fill={helmet} />
        <ellipse cx={30.2} cy={30.5} rx={2.4} ry={1.7} fill="#fff" opacity={0.28} />
        {children}
    </g>
);

const Rifleman = ({ c }: { c: Palette }) => (
    <Infantry c={c}>
        <rect x={37.5} y={14} width={2.6} height={28} rx={1} fill="#2a2d31" />
        <rect x={38.1} y={11} width={1.4} height={5} fill="#15171a" />
        <rect x={36.2} y={36} width={5} height={4} rx={1.2} fill="#3a2f22" />
    </Infantry>
);

const TeslaTrooper = ({ c }: { c: Palette }) => (
    <g>
        <ellipse cx={32} cy={39} rx={16} ry={10} fill="#12151a" opacity={0.5} />
        {/* backpack coils */}
        <circle cx={22.5} cy={45} r={5.5} fill="#2c3239" />
        <circle cx={41.5} cy={45} r={5.5} fill="#2c3239" />
        <circle cx={22.5} cy={45} r={3.6} fill="url(#glowCyan)" />
        <circle cx={41.5} cy={45} r={3.6} fill="url(#glowCyan)" />
        <Infantry c={c} helmet="#3f4a57">
            <rect x={37.4} y={17} width={3.2} height={24} rx={1.2} fill="#444c55" />
            <circle cx={39} cy={15.5} r={4.6} fill="url(#glowCyan)" />
            <path d="M39 11 l-2 3 l3 0 l-2 4" fill="none" stroke="#e8ffff" strokeWidth={1} />
        </Infantry>
    </g>
);

const Engineer = ({ c }: { c: Palette }) => (
    <Infantry c={{ ...c, base: '#d8892a', dark: '#7d4a12', light: '#f2b665' }} helmet="#f0c419">
        <circle cx={32} cy={32.5} r={6.4} fill="none" stroke="#a37f08" strokeWidth={1} />
        <rect x={38.5} y={24} width={2.2} height={15} rx={1} fill="#9aa3ab" />
        <circle cx={39.6} cy={23.5} r={3.4} fill="none" stroke="#c7ced4" strokeWidth={2} />
        <rect x={38.6} y={20.2} width={2} height={3} fill="#2b2f34" />
    </Infantry>
);

const Rocketeer = ({ c }: { c: Palette }) => (
    <g>
        {/* jetpack flames */}
        <path d="M24 44 q2 14 4 0z" fill="url(#glowOrange)" />
        <path d="M36 44 q2 14 4 0z" fill="url(#glowOrange)" />
        <rect x={22} y={36} width={7} height={11} rx={2.5} fill="#5b636b" />
        <rect x={35} y={36} width={7} height={11} rx={2.5} fill="#5b636b" />
        <Infantry c={c} helmet="#9aa0a6">
            <rect x={39.5} y={13} width={4.4} height={21} rx={1.8} fill="#3c4249" />
            <path d="M39.5 13 l2.2 -5 l2.2 5z" fill="#c1121f" />
        </Infantry>
    </g>
);

const Tank = ({ c }: { c: Palette }) => (
    <g>
        <Tracks x={13} y={9} w={10} h={46} />
        <Tracks x={41} y={9} w={10} h={46} />
        <path d="M20 10 h24 l3 7 v30 l-3 7 H20 l-3-7 V17z" fill={c.dark} />
        <path d="M21 11 h22 l2.6 6 v29 l-2.6 6 H21 l-2.6-6 V17z" fill={c.base} />
        <path d="M21 11 h22 l2.6 6 H18.4z" fill="#fff" opacity={0.18} />
        <path d="M18.4 46 h27.2 l-2.6 6 H21z" fill="#000" opacity={0.2} />
        <rect x={24} y={42} width={16} height={5} rx={1} fill="#000" opacity={0.18} />
        <circle cx={32} cy={32} r={11.5} fill={c.dark} />
        <circle cx={32} cy={31.5} r={10} fill={c.base} />
        <ellipse cx={29} cy={27.5} rx={5} ry={3.2} fill="#fff" opacity={0.22} />
        <circle cx={35} cy={36} r={3.6} fill="#232830" />
        <circle cx={35} cy={36} r={2.4} fill="#4b535c" />
        <rect x={30} y={3} width={4.4} height={23} rx={1.2} fill="url(#steel)" />
        <rect x={29} y={1.5} width={6.4} height={4.5} rx={1} fill="#2a2f35" />
    </g>
);

const PrismTank = ({ c }: { c: Palette }) => (
    <g>
        <Tracks x={14} y={12} w={9} h={42} />
        <Tracks x={41} y={12} w={9} h={42} />
        <path d="M32 6 l13 14 v26 l-5 7 H24 l-5-7 V20z" fill={c.dark} />
        <path d="M32 8.5 l11 12 v25 l-4.3 6 H25.300 l-4.300-6 V20.500z" fill={c.base} />
        <path d="M32 8.500 l11 12 H21z" fill="#fff" opacity={0.2} />
        {/* prism */}
        <circle cx={32} cy={33} r={12} fill="url(#glowCyan)" opacity={0.65} />
        <path d="M32 21 l8 12 l-8 12 l-8 -12z" fill="#7fe9ff" stroke="#e6ffff" strokeWidth={1.2} />
        <path d="M32 21 l8 12 h-8z" fill="#e6ffff" opacity={0.7} />
        <path d="M32 21 l-8 12 l8 12z" fill="#1aa3c4" opacity={0.7} />
        <rect x={30.800} y={4} width={2.400} height={14} fill="#3a424b" />
    </g>
);

const ApocalypseTank = ({ c }: { c: Palette }) => (
    <g>
        <Tracks x={8} y={8} w={13} h={50} />
        <Tracks x={43} y={8} w={13} h={50} />
        <path d="M18 8 h28 l4 8 v34 l-4 8 H18 l-4-8 V16z" fill={c.dark} />
        <path d="M19 9.5 h26 l3.400 7 v33 l-3.400 7 H19 l-3.400-7 V16.500z" fill={c.base} />
        <path d="M19 9.500 h26 l3.400 7 H15.600z" fill="#fff" opacity={0.16} />
        {/* side gun pods */}
        <rect x={9.500} y={14} width={5} height={14} rx={1.500} fill="#3a4047" />
        <rect x={49.500} y={14} width={5} height={14} rx={1.500} fill="#3a4047" />
        <rect x={10.800} y={7} width={2.400} height={9} fill="#232830" />
        <rect x={50.800} y={7} width={2.400} height={9} fill="#232830" />
        {/* turret */}
        <rect x={20} y={24} width={24} height={22} rx={5} fill={c.dark} />
        <rect x={21.500} y={25} width={21} height={19.500} rx={4.500} fill={c.base} />
        <ellipse cx={28} cy={29} rx={6} ry={3} fill="#fff" opacity={0.2} />
        <circle cx={32} cy={36} r={4} fill="#c1121f" />
        <path d="M32 33.200 l1 2 l2.200 .3 l-1.600 1.500 l.4 2.200 l-2-1.100 l-2 1.100 l.4-2.200 l-1.600-1.500 l2.200-.3z" fill="#f2c14e" />
        {/* twin barrels */}
        <rect x={24.500} y={1} width={4.400} height={26} rx={1.200} fill="url(#steel)" />
        <rect x={35.100} y={1} width={4.400} height={26} rx={1.200} fill="url(#steel)" />
        <rect x={23.500} y={0} width={6.400} height={4} rx={1} fill="#2a2f35" />
        <rect x={34.100} y={0} width={6.400} height={4} rx={1} fill="#2a2f35" />
    </g>
);

const ChronoMiner = ({ c }: { c: Palette }) => (
    <g>
        <Tracks x={11} y={14} w={9} h={42} />
        <Tracks x={44} y={14} w={9} h={42} />
        {/* cargo bin */}
        <rect x={17} y={26} width={30} height={30} rx={3} fill="#4a5058" />
        <rect x={19} y={28} width={26} height={26} rx={2} fill="#2a2f35" />
        <circle cx={28} cy={38} r={6} fill="#e5b312" />
        <circle cx={37} cy={43} r={7} fill="#f2c82e" />
        <circle cx={31} cy={46} r={5} fill="#ffd94a" />
        <circle cx={26} cy={36} r={2.400} fill="#fff6bd" opacity={0.8} />
        {/* cab */}
        <path d="M20 12 h24 l2 8 v8 H18 v-8z" fill={c.dark} />
        <path d="M21 13 h22 l1.700 7 v6.500 H19.300 V20z" fill={c.base} />
        <rect x={23} y={14.500} width={18} height={5.500} rx={1.500} fill="url(#glassBlue)" />
        {/* scoop */}
        <path d="M17 12 l3 -7 h24 l3 7z" fill="#3a4047" />
        <path d="M20 5 v4 M26 5 v4 M32 5 v4 M38 5 v4 M44 5 v4" stroke="#9aa3ab" strokeWidth={1.600} />
    </g>
);

const FighterJet = ({ c }: { c: Palette }) => (
    <g>
        {/* wings */}
        <path d="M32 18 L60 46 L60 52 L36 44 L32 48 L28 44 L4 52 L4 46z" fill="#6c757e" />
        <path d="M32 20 L57 46 L36 41 L32 44z" fill="#8b949c" />
        <path d="M32 20 L7 46 L28 41 L32 44z" fill="#7b848c" />
        <path d="M8 47.500 L26 43 M56 47.500 L38 43" stroke={c.base} strokeWidth={3} strokeLinecap="round" />
        {/* tail */}
        <path d="M32 46 L44 60 L40 60 L32 54 L24 60 L20 60z" fill="#59616a" />
        {/* fuselage */}
        <path d="M32 2 c4 6 6 14 6 24 v26 c0 4 -2 6 -6 6 c-4 0 -6 -2 -6 -6 V26 c0 -10 2 -18 6 -24z" fill="#aab2b9" />
        <path d="M32 2 c-4 6 -6 14 -6 24 v26 c0 4 2 6 6 6z" fill="#000" opacity={0.12} />
        <path d="M32 12 c2.400 3 3.200 7 3.200 11 s-1 6 -3.200 6 s-3.200 -2 -3.200 -6 s.8 -8 3.200 -11z" fill="url(#glassBlue)" stroke="#2a3a4a" strokeWidth={0.8} />
        <circle cx={32} cy={58} r={3} fill="url(#glowOrange)" />
    </g>
);

const KirovAirship = ({ c }: { c: Palette }) => (
    <g>
        {/* tail fins */}
        <path d="M32 46 L52 62 L46 62 L32 54 L18 62 L12 62z" fill="#4c5238" />
        {/* envelope */}
        <ellipse cx={32} cy={30} rx={19} ry={30} fill="#5c6346" />
        <ellipse cx={32} cy={30} rx={19} ry={30} fill="url(#envelopeShade)" />
        {[-18, -9, 0, 9, 18].map(y => (
            <path key={y} d={`M${32 - 19 * Math.sqrt(Math.max(0, 1 - ((y) / 30) ** 2))} ${30 + y} Q32 ${30 + y - 3} ${32 + 19 * Math.sqrt(Math.max(0, 1 - ((y) / 30) ** 2))} ${30 + y}`} fill="none" stroke="#2f3322" strokeWidth={1.200} opacity={0.7} />
        ))}
        <path d="M32 2 V58" stroke={c.base} strokeWidth={5} opacity={0.9} />
        <circle cx={32} cy={26} r={7} fill="#b01820" />
        <path d="M32 20.500 l1.700 3.600 l3.900 .5 l-2.900 2.700 l.8 3.900 l-3.500-2 l-3.500 2 l.8-3.900 l-2.900-2.700 l3.900-.5z" fill="#f2c14e" />
        {/* gondola and bombs */}
        <rect x={28} y={42} width={8} height={11} rx={2.500} fill="#2a2f35" />
        <circle cx={30} cy={36} r={1.800} fill="#16181b" />
        <circle cx={34} cy={36} r={1.800} fill="#16181b" />
    </g>
);

const Destroyer = ({ c }: { c: Palette }) => (
    <g>
        <path d="M32 1 C40 10 46 22 46 36 v18 c0 5 -3 8 -8 8 H26 c-5 0 -8 -3 -8 -8 V36 C18 22 24 10 32 1z" fill="#2c3238" />
        <path d="M32 4 C38.500 12 43.500 23 43.500 36 v17 c0 4 -2.500 6.500 -6.500 6.500 H27 c-4 0 -6.500 -2.500 -6.500 -6.500 V36 C20.500 23 25.500 12 32 4z" fill="#7d8790" />
        <path d="M32 4 C25.500 12 20.500 23 20.500 36 v17 c0 4 2.500 6.500 6.500 6.500 h5z" fill="#000" opacity={0.15} />
        <rect x={20.500} y={30} width={23} height={3} fill={c.base} />
        {/* bridge */}
        <rect x={25} y={36} width={14} height={13} rx={2} fill="#9aa3ab" />
        <rect x={27} y={38} width={10} height={4} rx={1} fill="url(#glassBlue)" />
        <rect x={29} y={43} width={6} height={5} fill="#4a5158" />
        {/* guns */}
        <circle cx={32} cy={19} r={5} fill="#4a5158" />
        <rect x={30.800} y={6} width={2.400} height={14} rx={1} fill="url(#steel)" />
        <circle cx={32} cy={54} r={4.500} fill="#4a5158" />
        <rect x={30.800} y={48} width={2.400} height={8} rx={1} fill="url(#steel)" transform="rotate(180 32 54)" />
    </g>
);

const SeaScorpion = ({ c }: { c: Palette }) => (
    <g>
        <path d="M32 6 C38 14 41 24 41 36 v16 c0 4 -3 6 -6 6 h-6 c-3 0 -6 -2 -6 -6 V36 c0 -12 3 -22 9 -30z" fill="#2a3036" />
        <path d="M32 9 C37 16 39 25 39 36 v15 c0 3 -2 5 -4.500 5 h-5 c-2.500 0 -4.500 -2 -4.500 -5 V36 c0 -11 2 -20 7 -27z" fill={c.base} />
        <path d="M32 9 C27 16 25 25 25 36 v15 c0 3 2 5 4.500 5 h2.500z" fill="#000" opacity={0.2} />
        <rect x={25} y={30} width={14} height={13} rx={2} fill="#3c434b" />
        {[0, 1, 2, 3].map(i => (
            <rect key={i} x={26.500 + i * 3.200} y={31.500} width={2.200} height={10} rx={0.800} fill="#c1121f" />
        ))}
        <rect x={29} y={18} width={6} height={9} rx={1.500} fill="#59616a" />
        <rect x={31} y={12} width={2} height={8} fill="#2a2f35" />
    </g>
);

const SPRITES: Record<UnitType, React.FC<{ c: Palette }>> = {
    [UnitType.RIFLEMAN]: Rifleman,
    [UnitType.TESLA_TROOPER]: TeslaTrooper,
    [UnitType.ENGINEER]: Engineer,
    [UnitType.ROCKETEER]: Rocketeer,
    [UnitType.TANK]: Tank,
    [UnitType.PRISM_TANK]: PrismTank,
    [UnitType.APOCALYPSE_TANK]: ApocalypseTank,
    [UnitType.CHRONO_MINER]: ChronoMiner,
    [UnitType.FIGHTER_JET]: FighterJet,
    [UnitType.KIROV_AIRSHIP]: KirovAirship,
    [UnitType.DESTROYER]: Destroyer,
    [UnitType.SEA_SCORPION]: SeaScorpion,
};

export const UnitSprite = ({ type, palette }: { type: UnitType; palette: Palette }) => {
    const Sprite = SPRITES[type];
    return <Sprite c={palette} />;
};
