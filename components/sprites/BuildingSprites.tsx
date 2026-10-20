import React from 'react';
import { BuildingType } from '../../types';
import { Palette } from './palette';

// Buildings are drawn top-down in a 64x64 box with a concrete pad, a long shadow to the lower
// right, and team-coloured roof panels / trim. They do not rotate.

const Pad = ({ r = 5 }: { r?: number }) => (
    <g>
        <rect x={2} y={2} width={60} height={60} rx={r} fill="#2a2d31" opacity={0.55} transform="translate(2 3)" />
        <rect x={2} y={2} width={60} height={60} rx={r} fill="url(#concrete)" stroke="#40454b" strokeWidth={1} />
        <path d="M2 18 H62 M2 46 H62" stroke="#000" strokeOpacity={0.08} />
    </g>
);

const Roof = ({ x, y, w, h, fill, r = 2 }: { x: number; y: number; w: number; h: number; fill: string; r?: number }) => (
    <g>
        <rect x={x + 2} y={y + 3} width={w} height={h} rx={r} fill="#000" opacity={0.28} />
        <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
        <rect x={x} y={y} width={w} height={Math.min(4, h / 3)} rx={r} fill="#fff" opacity={0.16} />
        <rect x={x} y={y + h - 3} width={w} height={3} rx={1} fill="#000" opacity={0.2} />
    </g>
);

const Tank = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
    <g>
        <circle cx={cx + 2} cy={cy + 3} r={r} fill="#000" opacity={0.28} />
        <circle cx={cx} cy={cy} r={r} fill="#8e979f" />
        <circle cx={cx} cy={cy} r={r} fill="url(#tankShade)" />
        <circle cx={cx} cy={cy} r={r - 3} fill="none" stroke="#5c646b" strokeWidth={1.2} />
        <ellipse cx={cx - r * 0.3} cy={cy - r * 0.35} rx={r * 0.35} ry={r * 0.22} fill="#fff" opacity={0.4} />
    </g>
);

const Star = ({ cx, cy, s = 1, fill = '#f2c14e' }: { cx: number; cy: number; s?: number; fill?: string }) => (
    <path transform={`translate(${cx} ${cy}) scale(${s})`} d="M0 -5 l1.500 3.300 l3.600 .4 l-2.700 2.400 l.8 3.600 l-3.200 -1.900 l-3.200 1.900 l.8 -3.600 l-2.700 -2.400 l3.600 -.4z" fill={fill} />
);

const HQ = ({ c }: { c: Palette }) => (
    <g>
        <Pad />
        <Roof x={9} y={13} w={46} h={40} fill="#6e777f" r={3} />
        <Roof x={9} y={13} w={46} h={9} fill={c.base} r={3} />
        <Roof x={12} y={40} w={14} h={10} fill="#4a5158" />
        <Roof x={38} y={40} w={14} h={10} fill="#4a5158" />
        {/* radar dome */}
        <circle cx={34} cy={32} r={13} fill="#000" opacity={0.25} transform="translate(2 3)" />
        <circle cx={32} cy={31} r={13} fill="#c8d0d6" />
        <circle cx={32} cy={31} r={13} fill="url(#tankShade)" />
        <circle cx={32} cy={31} r={9} fill="none" stroke="#7b848c" strokeWidth={1.200} />
        <circle cx={32} cy={31} r={4.500} fill="none" stroke="#7b848c" strokeWidth={1.200} />
        <path d="M32 31 L42 22" stroke="#e8edf1" strokeWidth={2.400} strokeLinecap="round" />
        <circle cx={32} cy={31} r={2} fill={c.base} />
        <Star cx={14.500} cy={17.500} s={0.8} />
    </g>
);

const Refinery = ({ c }: { c: Palette }) => (
    <g>
        <Pad />
        <Tank cx={19} cy={20} r={11} />
        <Tank cx={43} cy={20} r={11} />
        <Roof x={8} y={36} w={30} h={20} fill="#6e777f" r={3} />
        <Roof x={8} y={36} w={30} h={6} fill={c.base} r={3} />
        <rect x={12} y={46} width={22} height={4} fill="#3b4148" />
        {/* conveyor + ore */}
        <rect x={42} y={36} width={14} height={22} rx={2} fill="#3b4148" />
        <circle cx={49} cy={46} r={5} fill="#e5b312" />
        <circle cx={51} cy={52} r={3.600} fill="#ffd94a" />
        <path d="M19 31 V36 M43 31 V36" stroke="#4a5158" strokeWidth={3} />
        <rect x={31} y={4} width={4} height={14} fill="#4a5158" />
        <circle cx={33} cy={4} r={3} fill="#6e777f" />
    </g>
);

const PowerPlant = ({ c }: { c: Palette }) => (
    <g>
        <Pad />
        <Tank cx={20} cy={22} r={12} />
        <circle cx={20} cy={22} r={7} fill="#2a2f35" />
        <circle cx={20} cy={22} r={6} fill="#444b53" opacity={0.9} />
        <circle cx={18} cy={20} r={3} fill="#cfd5da" opacity={0.6} />
        <Tank cx={45} cy={22} r={10} />
        <circle cx={45} cy={22} r={5.500} fill="#2a2f35" />
        <Roof x={9} y={38} w={46} h={17} fill="#6e777f" r={3} />
        <Roof x={9} y={38} w={46} h={5} fill={c.base} r={3} />
        <circle cx={32} cy={48} r={5} fill="url(#glowYellow)" />
        <path d="M30 44 l-2 4 h3 l-1 4 l4 -5 h-3 l1 -3z" fill="#fff7c2" />
    </g>
);

const Barracks = ({ c }: { c: Palette }) => (
    <g>
        <Pad />
        {/* long tent roof with ridge */}
        <rect x={9} y={12} width={46} height={34} rx={3} fill="#000" opacity={0.28} transform="translate(2 3)" />
        <rect x={9} y={12} width={46} height={34} rx={3} fill="#5d6b3a" />
        <rect x={9} y={12} width={23} height={34} rx={3} fill="#6b7a43" />
        <path d="M32 12 V46" stroke="#3a4424" strokeWidth={2} />
        {[16, 22, 28, 34, 40].map(y => <line key={y} x1={9} x2={55} y1={y} y2={y} stroke="#000" strokeOpacity={0.12} />)}
        <rect x={9} y={12} width={46} height={6} rx={3} fill={c.base} />
        <rect x={9} y={40} width={46} height={6} rx={3} fill={c.base} opacity={0.85} />
        {/* sandbags */}
        {[0, 1, 2, 3, 4].map(i => <ellipse key={i} cx={14 + i * 9} cy={53} rx={4.500} ry={2.600} fill="#b59b6a" stroke="#6f5e3a" strokeWidth={0.8} />)}
        {/* flag */}
        <line x1={57} y1={14} x2={57} y2={36} stroke="#d0d5d9" strokeWidth={1.500} />
        <path d="M57 14 h-8 l2 3.500 l-2 3.500 h8z" fill={c.base} />
    </g>
);

const WarFactory = ({ c }: { c: Palette }) => (
    <g>
        <Pad />
        <Roof x={7} y={8} w={50} h={44} fill="#69727a" r={3} />
        <rect x={7} y={8} width={50} height={8} rx={3} fill={c.base} />
        {/* roof ridges */}
        {[18, 25, 32, 39].map(y => <line key={y} x1={10} x2={54} y1={y} y2={y} stroke="#000" strokeOpacity={0.15} strokeWidth={1.600} />)}
        {/* vents + stack */}
        <rect x={12} y={20} width={9} height={7} fill="#3b4148" />
        <rect x={43} y={20} width={9} height={7} fill="#3b4148" />
        <circle cx={47} cy={34} r={4} fill="#2a2f35" />
        <circle cx={47} cy={34} r={2.600} fill="#59616a" />
        {/* garage door */}
        <rect x={16} y={42} width={32} height={10} fill="#16181b" />
        {[0, 1, 2, 3, 4].map(i => <line key={i} x1={16} x2={48} y1={44 + i * 2} y2={44 + i * 2} stroke="#3b4148" strokeWidth={0.800} />)}
        <path d="M16 42 H48" stroke="#f2c14e" strokeWidth={1.500} strokeDasharray="3 2" />
        <Star cx={14} cy={36} s={0.7} />
    </g>
);

const Airfield = ({ c }: { c: Palette }) => (
    <g>
        <Pad />
        {/* runway */}
        <rect x={8} y={4} width={22} height={56} fill="#2f3338" />
        <path d="M19 8 V56" stroke="#e8e8e8" strokeWidth={1.600} strokeDasharray="5 4" />
        <path d="M9 6 H29 M9 58 H29" stroke="#e8e8e8" strokeWidth={1.200} />
        {/* hangar */}
        <Roof x={36} y={10} w={21} h={26} fill="#69727a" r={3} />
        <rect x={36} y={10} width={21} height={6} rx={3} fill={c.base} />
        <rect x={39} y={28} width={15} height={8} fill="#16181b" />
        {/* tower */}
        <circle cx={47} cy={48} r={6} fill="#4a5158" />
        <circle cx={47} cy={48} r={4} fill="url(#glassBlue)" />
        <path d="M47 48 L47 41" stroke="#d0d5d9" strokeWidth={1.200} />
    </g>
);

const NavalYard = ({ c }: { c: Palette }) => (
    <g>
        <rect x={2} y={2} width={60} height={60} rx={5} fill="url(#waterPad)" stroke="#2c5d8a" strokeWidth={1} />
        <rect x={2} y={2} width={60} height={26} rx={5} fill="url(#concrete)" />
        <Roof x={8} y={6} w={30} h={18} fill="#69727a" r={3} />
        <rect x={8} y={6} width={30} height={5} rx={3} fill={c.base} />
        {/* piers */}
        <rect x={10} y={28} width={6} height={32} fill="#8b9096" stroke="#555a60" strokeWidth={0.800} />
        <rect x={48} y={28} width={6} height={32} fill="#8b9096" stroke="#555a60" strokeWidth={0.800} />
        {/* gantry crane */}
        <path d="M14 28 V8 M50 28 V12" stroke="#f2c14e" strokeWidth={2.400} />
        <path d="M14 14 H52" stroke="#f2c14e" strokeWidth={2.400} />
        <path d="M30 14 V38" stroke="#2a2f35" strokeWidth={1.400} />
        <rect x={27} y={38} width={6} height={5} fill="#2a2f35" />
        <circle cx={46} cy={16} r={3.500} fill="#59616a" />
    </g>
);

const RepairBay = ({ c }: { c: Palette }) => (
    <g>
        <Pad />
        {/* hazard border */}
        <rect x={9} y={9} width={46} height={46} rx={3} fill="#2a2d31" />
        <rect x={11} y={11} width={42} height={42} rx={2} fill="#3d4349" />
        {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${9 + i * 6} 9 l6 0 l-6 6z`} fill={i % 2 ? '#f2c14e' : '#16181b'} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
            <path key={'b' + i} d={`M${9 + i * 6} 55 l6 0 l-6 -6z`} fill={i % 2 ? '#f2c14e' : '#16181b'} />
        ))}
        {/* arms */}
        <rect x={9} y={26} width={8} height={12} rx={2} fill={c.base} />
        <rect x={47} y={26} width={8} height={12} rx={2} fill={c.base} />
        <path d="M17 32 H24 M47 32 H40" stroke="#c7ced4" strokeWidth={3} strokeLinecap="round" />
        <circle cx={32} cy={32} r={7} fill="none" stroke="#f2c14e" strokeWidth={2} strokeDasharray="3 2.500" />
        <path d="M30 35 l5 -5 m-1 -2 l3 -1 l-1 3z" stroke="#e8edf1" strokeWidth={1.600} fill="none" strokeLinecap="round" />
    </g>
);

const ChronoSphere = ({ c }: { c: Palette }) => (
    <g>
        <Pad r={32} />
        <circle cx={32} cy={32} r={27} fill="none" stroke="#5b6168" strokeWidth={1.500} />
        {[0, 60, 120, 180, 240, 300].map(a => {
            const x = 32 + Math.cos((a * Math.PI) / 180) * 23;
            const y = 32 + Math.sin((a * Math.PI) / 180) * 23;
            return (
                <g key={a}>
                    <circle cx={x + 1.500} cy={y + 2} r={3.500} fill="#000" opacity={0.3} />
                    <circle cx={x} cy={y} r={3.500} fill="#59616a" />
                    <circle cx={x} cy={y} r={1.800} fill="#a5f3fc" />
                </g>
            );
        })}
        <circle cx={32} cy={32} r={17} fill="url(#glowPurple)" />
        <circle cx={32} cy={32} r={12} fill="url(#sphere)" />
        <ellipse cx={28} cy={27} rx={5} ry={3} fill="#fff" opacity={0.55} />
        <ellipse cx={32} cy={32} rx={19} ry={6} fill="none" stroke="#c4b5fd" strokeWidth={1.400} transform="rotate(30 32 32)" />
        <ellipse cx={32} cy={32} rx={19} ry={6} fill="none" stroke="#a5f3fc" strokeWidth={1.400} transform="rotate(-40 32 32)" />
        <circle cx={32} cy={32} r={2} fill={c.light} />
    </g>
);

const NuclearSilo = ({ c }: { c: Palette }) => (
    <g>
        <Pad r={32} />
        <circle cx={32} cy={32} r={26} fill="#2a2d31" />
        <circle cx={32} cy={32} r={23} fill="#16181b" />
        <circle cx={32} cy={32} r={16} fill="url(#glowRed)" />
        {/* missile nose seen from above */}
        <circle cx={32} cy={32} r={8.500} fill="#c8ced3" />
        <circle cx={32} cy={32} r={8.500} fill="url(#tankShade)" />
        <circle cx={32} cy={32} r={3} fill="#c1121f" />
        {/* hatch doors */}
        <path d="M9 32 a23 23 0 0 1 23 -23 v23z" fill="#59616a" stroke="#2a2f35" strokeWidth={1.200} />
        <path d="M55 32 a23 23 0 0 1 -23 23 v-23z" fill="#59616a" stroke="#2a2f35" strokeWidth={1.200} />
        <path d="M11 32 H32 V11" fill="none" stroke="#f2c14e" strokeWidth={1.400} strokeDasharray="3 2" />
        <path d="M53 32 H32 V53" fill="none" stroke="#f2c14e" strokeWidth={1.400} strokeDasharray="3 2" />
        <rect x={29} y={29} width={6} height={6} rx={1} fill={c.base} />
    </g>
);

const SPRITES: Record<BuildingType, React.FC<{ c: Palette }>> = {
    [BuildingType.HQ]: HQ,
    [BuildingType.REFINERY]: Refinery,
    [BuildingType.POWER_PLANT]: PowerPlant,
    [BuildingType.BARRACKS]: Barracks,
    [BuildingType.WAR_FACTORY]: WarFactory,
    [BuildingType.AIRFIELD]: Airfield,
    [BuildingType.NAVAL_YARD]: NavalYard,
    [BuildingType.REPAIR_BAY]: RepairBay,
    [BuildingType.CHRONO_SPHERE]: ChronoSphere,
    [BuildingType.NUCLEAR_MISSILE_SILO]: NuclearSilo,
};

export const BuildingSprite = ({ type, palette }: { type: BuildingType; palette: Palette }) => {
    const Sprite = SPRITES[type];
    return <Sprite c={palette} />;
};
