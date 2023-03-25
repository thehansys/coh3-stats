import { GetStaticPaths, NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { IconBarrierBlock } from "@tabler/icons";
import { Card, Flex, Stack, Text, Title } from "@mantine/core";
import { localizedNames } from "../../../src/coh3/coh3-data";
import { raceType } from "../../../src/coh3/coh3-types";
import {
  BuildingCard,
  BuildingSchema,
} from "../../../components/unit-cards/building-description-card";
import FactionIcon from "../../../components/faction-icon";
import { BuildingType } from "../../../src/coh3";
import {
  SbpsType,
  EbpsType,
  UpgradesType,
  filterMultiplayerBuildings,
  fetchLocstring,
  getEbpsStats,
  getSbpsStats,
  getUpgradesStats,
  WeaponType,
  getWeaponStats,
  getAbilitiesStats,
  AbilitiesType,
  getBattlegroupStats,
  BattlegroupsType,
  getResolvedUpgrades,
  getResolvedSquads,
  HalfTrackDeploymentUnitsAfrikaKorps,
  getResolvedAbilities,
} from "../../../src/unitStats";
import ContentContainer from "../../../components/Content-container";
import { BattlegroupCard } from "../../../components/unit-cards/battlegroup-card";

const RaceBagDescription: Record<raceType, string> = {
  // Locstring value: $11234530
  german:
    "A steadfast and elite force that can hold against even the most stubborn foe. Unlock unique arsenals to specialize your forces.",
  // Locstring value: $11234529
  american:
    "Versatile infantry and weaponry that can displace any opponent. Experience is key to improving your forces for the fight ahead.",
  // Locstring value: $11220490
  dak: "A combined-arms force of aggressive vehicles, plentiful reinforcements and stubborn tanks that can break down any enemy line.",
  // Locstring value: $11234532
  british:
    "Infantry and team weapons form a backbone that is tough to break. Myriad vehicles will create the opening you need to seize the day.",
};

interface RaceDetailProps {
  weaponData: WeaponType[];
  sbpsData: SbpsType[];
  ebpsData: EbpsType[];
  upgradesData: UpgradesType[];
  abilitiesData: AbilitiesType[];
  battlegroupData: BattlegroupsType[];
  locstring: Record<string, string>;
}

const RaceDetail: NextPage<RaceDetailProps> = ({
  ebpsData,
  sbpsData,
  upgradesData,
  battlegroupData,
  abilitiesData,
}) => {
  // console.log("🚀 ~ file: [raceId].tsx:55 ~ abilitiesData:", abilitiesData);
  // The `query` contains the `raceId`, which is the filename as route slug.
  const { query } = useRouter();

  const raceToFetch = (query.raceId as raceType) || "american";
  const localizedRace = localizedNames[raceToFetch];

  return (
    <>
      <Head>
        <title>{localizedRace} - COH3 Explorer</title>
        <meta name="description" content={`${localizedRace} - COH3 Explorer`} />
      </Head>
      <ContentContainer>
        <Stack>
          <Flex direction="row" align="center" gap="md">
            <FactionIcon name={raceToFetch} width={64} />
            <Title order={2}>{localizedRace}</Title>
          </Flex>

          <Text size="lg">{RaceBagDescription[raceToFetch]}</Text>
        </Stack>

        <Flex direction="row" gap={16} mt={24}>
          <IconBarrierBlock size={50} />
          <Text color="orange.6" italic>
            Important Note: This section may contain some inacurracies regarding the unit costs.
            We still working to refine the calculation for infantry so feel free to report any
            bug.
          </Text>
        </Flex>

        {/* Battlegroups Section */}
        <Stack mt={32}>
          <Title order={4}>Battlegroups</Title>

          {BattlegroupCard(raceToFetch, { battlegroupData, upgradesData, abilitiesData })}
        </Stack>

        {/* Buildings Section */}
        <Stack mt={32}>
          <Title order={4}>Buildings</Title>

          {BuildingMapping(raceToFetch, {
            ebpsData,
            sbpsData,
            upgradesData,
            abilitiesData,
          })}
        </Stack>
      </ContentContainer>
    </>
  );
};

const BuildingMapping = (
  race: raceType,
  data: {
    ebpsData: EbpsType[];
    sbpsData: SbpsType[];
    upgradesData: UpgradesType[];
    abilitiesData: AbilitiesType[];
  },
) => {
  const buildings = filterMultiplayerBuildings(data.ebpsData, race);
  return (
    <Stack>
      {buildings.map((building) => {
        // Temporary workaround while a better idea to display call-ins of DAK shows up.
        const upgrades =
          race === "dak" && building.id === "halftrack_deployment_ak"
            ? generateAfrikaKorpsCallIns(data.abilitiesData)
            : getBuildingUpgrades(building, data.upgradesData);
        const units = getBuildingTrainableUnits(building, data.sbpsData, data.ebpsData);
        return (
          <Card key={building.id} p="sm" radius="md" withBorder>
            <BuildingCard
              // @todo: Validate types.
              types={building.unitTypes as BuildingType[]}
              desc={{
                screen_name: building.ui.screenName,
                help_text: building.ui.helpText,
                extra_text: building.ui.extraText,
                brief_text: building.ui.briefText,
                icon_name: building.ui.iconName,
                symbol_icon_name: building.ui.symbolIconName,
              }}
              units={units}
              upgrades={upgrades}
              time_cost={{
                fuel: building.cost.fuel,
                munition: building.cost.munition,
                manpower: building.cost.manpower,
                popcap: building.cost.popcap,
                time_seconds: building.cost.time,
              }}
              health={{
                hitpoints: building.health.hitpoints,
              }}
            ></BuildingCard>
          </Card>
        );
      })}
    </Stack>
  );
};

function getBuildingTrainableUnits(
  building: EbpsType,
  sbpsData: SbpsType[],
  ebpsData: EbpsType[],
): BuildingSchema["units"] {
  return Object.entries(getResolvedSquads(building.spawnItems, sbpsData, ebpsData)).map(
    ([id, { ui, time_cost }]) => ({
      desc: {
        id,
        screen_name: ui.screenName,
        help_text: ui.helpText,
        brief_text: ui.briefText,
        symbol_icon_name: ui.symbolIconName,
        icon_name: ui.iconName,
      },
      time_cost,
    }),
  );
}

function getBuildingUpgrades(
  building: EbpsType,
  upgradesData: UpgradesType[],
): BuildingSchema["upgrades"] {
  return Object.entries(getResolvedUpgrades(building.upgradeRefs, upgradesData)).map(
    ([id, { ui, cost }]) => ({
      id,
      desc: {
        screen_name: ui.screenName,
        help_text: ui.helpText,
        extra_text: ui.extraText,
        brief_text: ui.briefText,
        icon_name: ui.iconName,
      },
      time_cost: {
        fuel: cost.fuel,
        munition: cost.munition,
        manpower: cost.manpower,
        popcap: cost.popcap,
        time_seconds: cost.time,
      },
    }),
  );
}

/** Generate the call-ins as upgrades although those are abilities under the hood. */
function generateAfrikaKorpsCallIns(abilitiesData: AbilitiesType[]): BuildingSchema["upgrades"] {
  return Object.entries(
    getResolvedAbilities(Object.keys(HalfTrackDeploymentUnitsAfrikaKorps), abilitiesData),
  ).map(([id, { ui, cost, rechargeTime }]) => ({
    id,
    desc: {
      screen_name: ui.screenName,
      help_text: ui.helpText,
      extra_text: ui.extraText,
      brief_text: ui.briefText,
      icon_name: ui.iconName,
    },
    time_cost: {
      fuel: cost.fuel,
      munition: cost.munition,
      manpower: cost.manpower,
      popcap: cost.popcap,
      time_seconds: rechargeTime,
    },
  }));
}

// Generates `/dak`.
export const getStaticPaths: GetStaticPaths<{ raceId: string }> = async () => {
  return {
    paths: [
      { params: { raceId: "dak" } },
      { params: { raceId: "american" } },
      { params: { raceId: "british" } },
      { params: { raceId: "german" } },
    ],
    fallback: false, // can also be true or 'blocking'
  };
};

export const getStaticProps = async () => {
  const locstring = await fetchLocstring();

  // map Data at built time
  const weaponData = await getWeaponStats();

  // map Data at built time
  const ebpsData = await getEbpsStats();

  // map Data at built time
  const sbpsData = await getSbpsStats();

  // map Data at built time
  const upgradesData = await getUpgradesStats();

  const abilitiesData = await getAbilitiesStats();
  const battlegroupData = await getBattlegroupStats();

  return {
    props: {
      weaponData,
      sbpsData,
      ebpsData,
      upgradesData,
      abilitiesData,
      battlegroupData,
      locstring,
    },
  };
};

export default RaceDetail;
