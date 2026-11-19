import Image from "next/image";
import {
  GRADES,
  rankImages,
  formatPrice,
  getAttributeImage,
} from "@/lib/utils";
import PlayersOnTeam, { type AssignedPlayer } from "./PlayersOnTeam";
import { SQUAD_BUDGETS, getSquadSize } from "./possible-players";
import styles from "./match-manager-info.module.css";

type Team = {
  team_id: number;
  strength_lvl: number;
  play_style: number;
  discipline: number;
  sub_style: number;
  player_pref: number;
  pos_loyalty: number;
  stadium_id: number | null;
  action_shooting: number | null;
  action_long_passing: number | null;
  action_through_passing: number | null;
  action_dribbling: number | null;
  action_direct_passing: number | null;
  bonus_shoot: number;
  bonus_speed: number;
  bonus_stamina: number;
  bonus_tech: number;
  bonus_toughness: number;
  bonus_jump: number;
  bonus_willpower: number | null;
};

type Props = {
  title: string;
  team: Team;
  assignedPlayers: AssignedPlayer[];
  possiblePlayers: AssignedPlayer[];
};

type TacticBarProps = {
  title: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
};

const LEAGUES = [
  { id: 0, name: "Beginner League", icon: "/beginner.png" },
  { id: 1, name: "Advanced League", icon: "/advanced.png" },
  { id: 2, name: "Pro League 2", icon: "/2-liga.png" },
  { id: 3, name: "Pro League 1", icon: "/1-liga.png" },
  { id: 4, name: "Europe", icon: "/mondial-icon.png" },
  { id: 5, name: "International", icon: "/mondial-icon.png" },
];

const crowdLevels = [1, 1, 2, 3, 4, 5, 6, 7, 7];

const crowdFactors = [0, 1, 1, 1, 2, 2, 3, 3];

const crowdLabels = ["None", "Low", "Medium", "High"];

const KITS = [
  { folder: "goalkeeper", name: "Keeper" },
  { folder: "home", name: "Home" },
  { folder: "away", name: "Away" },
];

function getInitialLeague(teamId: number): number {
  if (teamId < 5) return 0;
  if (teamId < 11) return 1;
  if (teamId < 19) return 2;
  if (teamId < 31) return 3;
  if (teamId < 37) return 4;
  if (teamId === 44) return 4;
  return 5;
}

function GradeIcon({ value }: { value: number | null }) {
  const grade = value !== null ? GRADES[value] : undefined;

  if (!grade || !rankImages[grade]) {
    return <span className={styles.gradeMissing}>—</span>;
  }

  return (
    <Image
      src={rankImages[grade]}
      alt={grade}
      title={grade}
      width={30}
      height={32}
      unoptimized
      className={styles.gradeIcon}
    />
  );
}

function TacticBar({ title, value, leftLabel, rightLabel }: TacticBarProps) {
  const position = Math.max(0, Math.min(100, value));

  return (
    <div className={styles.tacticBar}>
      <div className={styles.tacticTitle}>{title}:</div>

      <div
        className={styles.tacticTrack}
        role="meter"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={position}
      >
        <div className={styles.tacticRange}>
          <div className={styles.tacticMarker} style={{ left: `${position}%` }}>
            {value}
          </div>
        </div>
      </div>

      <div className={styles.tacticLabels}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

export default function MatchManagerInfo({
  title,
  team,
  assignedPlayers,
  possiblePlayers,
}: Props) {
  const teamImageId = String(team.team_id).padStart(4, "0");

  const league = LEAGUES[getInitialLeague(team.team_id)];

  const squadSize = getSquadSize(team);
  const targetSquadBudget = SQUAD_BUDGETS[team.strength_lvl];

  const crowdLevel = crowdLevels[team.strength_lvl];
  const crowdPressure = crowdFactors[crowdLevel];
  const crowdLabel = crowdLabels[crowdPressure];

  const actionSkills = [
    { name: "Shooting", value: team.action_shooting },
    { name: "Long Passing", value: team.action_long_passing },
    { name: "Through Passing", value: team.action_through_passing },
    { name: "Dribbling", value: team.action_dribbling },
    { name: "Direct Passing", value: team.action_direct_passing },
  ];

  const skillBoosts = [
    { name: "Shoot", value: team.bonus_shoot },
    { name: "Speed", value: team.bonus_speed },
    { name: "Stamina", value: team.bonus_stamina },
    { name: "Technic", value: team.bonus_tech },
    { name: "Strength", value: team.bonus_toughness },
    { name: "Jump", value: team.bonus_jump },
    { name: "Will", value: team.bonus_willpower },
  ];

  const teamBonuses = skillBoosts.map((attribute) => attribute.value ?? 0);

  return (
    <>
      <h1>{title}</h1>

      <div className={styles["panel-opp-info"]}>
        <div className={styles.teamOverview}>
          <Image
            src={`/team-images/${teamImageId}.png`}
            alt={title}
            width={150}
            height={150}
            unoptimized
            className={styles.teamIcon}
          />

          <div className={styles.teamDetails}>
            <div className={styles.leagueRow}>
              <strong>Rank:</strong>

              <Image
                src={league.icon}
                alt={league.name}
                title={league.name}
                width={32}
                height={32}
                unoptimized
                className={styles.leagueIcon}
              />
            </div>

            <div>
              Squad Size: <strong>{squadSize}</strong>
            </div>

            <div>
              Target Squad Budget:{" "}
              <strong>
                {targetSquadBudget !== undefined
                  ? formatPrice(targetSquadBudget)
                  : "—"}
              </strong>
            </div>
          </div>

          <div className={styles.kits}>
            {KITS.map((kit) => (
              <div key={kit.folder} className={styles.kit}>
                <Image
                  src={`/kits-images/${kit.folder}/${teamImageId}.png`}
                  alt={`${kit.name} kit`}
                  width={54}
                  height={28}
                  unoptimized
                  className={styles.kitImage}
                />

                <span>{kit.name}</span>
              </div>
            ))}
          </div>

          <div className={styles.tactics}>
            <TacticBar
              title="Play Style"
              value={team.play_style}
              leftLabel="Defensive"
              rightLabel="Offensive"
            />

            <TacticBar
              title="Discipline"
              value={team.discipline}
              leftLabel="Flexible"
              rightLabel="Strict"
            />

            <TacticBar
              title="Substitution"
              value={team.sub_style}
              leftLabel="Reactive"
              rightLabel="Proactive"
            />

            <TacticBar
              title="Player Selection"
              value={team.player_pref}
              leftLabel="Reliable"
              rightLabel="Spontaneous"
            />
          </div>
        </div>

        <div className={styles.teamAbilities}>
          <div className={styles.stadium}>
            <div className={styles.stadiumTitle}>International Stadion</div>

            <Image
              src="/stadion1.png"
              alt="International Stadion"
              width={300}
              height={230}
              unoptimized
              className={styles.stadiumImage}
            />

            <div
              className={styles.crowdPressure}
              title={
                crowdLabel !== undefined
                  ? `${crowdLabel} – Factor ${crowdPressure}`
                  : undefined
              }
            >
              Crowd Pressure:{" "}
              {crowdLevel !== undefined ? `${crowdLevel}/7` : "—"}
            </div>
          </div>

          <div className={styles.positionFamiliarity}>
            <strong>Position Familiarity</strong>
            <GradeIcon value={team.pos_loyalty} />
          </div>

          <div className={styles.actionSkills}>
            <h2 className={styles.actionTitle}>Action Skills</h2>

            <div className={styles.actionList}>
              {actionSkills.map((skill) => (
                <div key={skill.name} className={styles.actionRow}>
                  <span>{skill.name}</span>
                  <GradeIcon value={skill.value} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.skillBoostSection}>
          <h2 className={styles.skillBoostTitle}>Player Skill Boost</h2>

          <div className={styles.skillBoostGrid}>
            {skillBoosts.map((attribute, index) => (
              <div
                key={attribute.name}
                className={styles.skillBoostItem}
                title={`${attribute.name}: ${attribute.value ?? "—"}`}
              >
                <Image
                  src={getAttributeImage(attribute.name, index)}
                  alt={attribute.name}
                  width={30}
                  height={30}
                  unoptimized
                  className={styles.skillBoostIcon}
                />

                <span className={styles.skillBoostValue}>
                  {attribute.value ?? "—"}
                </span>
              </div>
            ))}
          </div>

          <PlayersOnTeam
            title="Assigned Players"
            emptyMessage="No assigned players"
            players={assignedPlayers}
            teamBonuses={teamBonuses}
          />

          <PlayersOnTeam
            title="Possible Players"
            emptyMessage="No possible players"
            players={possiblePlayers}
            teamBonuses={teamBonuses}
          />
        </div>
      </div>
    </>
  );
}
