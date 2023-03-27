import React, { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@mantine/hooks";

//import { LevelContext } from './LevelContext.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as CTitle,
  Tooltip as CTooltip,
  Legend,
  Filler,
} from "chart.js";

import { Line } from "react-chartjs-2";
import {
  Container,
  Space,
  useMantineTheme,
  Grid,
  Flex,
  Box,
  Stack,
  Title,
  Switch,
  HoverCard,
  Image,
  Text,
  Group,
  SimpleGrid,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { UnitSearch } from "./unitSearch";
import { DpsUnitCustomizing } from "./dpsUnitCustomizing";
import { EbpsType } from "../../src/unitStats/mappingEbps";
// import slash from "slash";
import { WeaponType } from "../../src/unitStats/mappingWeapon";
import { SbpsType } from "../../src/unitStats/mappingSbps";
import Head from "next/head";
import { IconAdjustments } from "@tabler/icons";
import {
  CustomizableUnit,
  getDpsVsHealth,
  getWeaponDPSData,
  mapCustomizableUnit,
  updateHealth,
} from "../../src/unitStats/dpsCommon";
import { filter } from "lodash";
import { getFactionIcon } from "../../src/unitStats";

// let unitSelectionList :  CustomizableUnit[] = [];
let unitSelectionList1: CustomizableUnit[] = [];
let unitSelectionList2: CustomizableUnit[] = [];

// function hexToRgbA(hex: string, opacity: string) {
//   let c: any;
//   if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
//     c = hex.substring(1).split("");
//     if (c.length == 3) {
//       c = [c[0], c[0], c[1], c[1], c[2], c[2]];
//     }
//     c = "0x" + c.join("");
//     return "rgba(" + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") + "," + opacity + ")";
//   }
//   throw new Error("Bad Hex");
// }

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  CTitle,
  CTooltip,
  Legend,
  Filler,
);

// Line Chart Options
export const options = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
      display: true,
    },
  },
  scales: {
    x: {
      type: "linear" as const,
      min: 0,
      suggestedMax: 35,
      title: {
        display: true,
        text: "Distance",
      },

      grid: {
        lineWidth: 0.5,
        display: true,
      },
    },
    y: {
      type: "linear" as const,
      suggestedMin: 0,
      suggestedMax: 35,
      grid: {
        lineWidth: 0.5,
        //  color: "#6a6a6a",
        display: false,
      },
      title: {
        display: true,
        text: "DPS",
      },
    },
  },
};

// description: item.ui_name || 'No Description Available',
export const mapChartData = (data: any[], id?: string, isStaircase?: boolean) => {
  const chartLine = {
    label: "No Item Selected",
    data: data,
    borderWidth: 3,
    borderColor: "#4dabf7", // '#d048b6',
    //cubicInterpolationMode: "monotone" as const,
    //stepped: "after",
    stepped: "",
    tension: 0.1,
    pointStyle: "cross",
    fill: false,
    backgroundColor: "rgba(200, 200, 200, 0.2)",
    pointRadius: 0,
    pointHoverRadius: 30,
    pointHitRadius: 10,
    intersect: true,
  };

  if (id) chartLine.label = id;

  if (isStaircase) {
    //set.cubicInterpolationMode = "monotone";
    chartLine.stepped = "after";
  }

  return chartLine;
};

const setScreenOptions = (chartOptions: any, isLargeScreen: boolean) => {
  if (!isLargeScreen) {
    options.scales.x.title.display = false;
    options.scales.y.title.display = false;
    options.plugins.legend.display = false;
  } else {
    options.scales.x.title.display = true;
    options.scales.y.title.display = true;
    options.plugins.legend.display = true;
  }
};

const mapUnitSelection = (
  sbps: SbpsType[],
  ebps: EbpsType[],
  weapons: WeaponType[],
  unitFilter: string[] = [],
  unitIndex = 1,
) => {
  const selectionFields = [];

  for (const squad of sbps) {
    if (
      squad.ui.symbolIconName != "" &&
      squad.faction != "british" &&
      (unitFilter.length == 0 || unitFilter.includes(squad.faction))
    ) {
      const custUnit = mapCustomizableUnit(squad, ebps, weapons);
      if (custUnit.weapon_member.length > 0) selectionFields.push(custUnit);
    }
  }
  return selectionFields;
};

const generateFilterButtons = (
  unitFilter: string[],
  callback: any,
  index = 1,
  unitSelectionList: CustomizableUnit[],
) => {
  const factions = ["afrika_korps", "american", "british_africa", "german"];
  const filterButtons: any[] = [];

  for (const faction of factions) {
    const source = getFactionIcon(faction);
    filterButtons.push(
      <Tooltip key={faction + index} label="Filter">
        <ActionIcon
          key={faction + index}
          size="sm"
          variant={unitFilter.includes(faction) ? "gradient" : "trannsparent"}
          onClick={() => callback(faction, index, unitFilter, unitSelectionList)}
        >
          <Image src={source} alt={"Filter"}></Image>
        </ActionIcon>
      </Tooltip>,
    );
  }

  return filterButtons;
};

interface IDPSProps {
  weaponData: WeaponType[];
  sbpsData: SbpsType[];
  ebpsData: EbpsType[];
}

export const DpsChart = (props: IDPSProps) => {
  const filter_def1: string[] = [];
  const filter_def2: string[] = [];
  const searchData_default: CustomizableUnit[] = [];

  const [activeData] = useState(searchData_default);
  const [unitFilter1, setFilter1] = useState(filter_def1);
  const [unitFilter2, setFilter2] = useState(filter_def2);

  const [rerender, setRerender] = useState(false);
  // const [isStaircase, setStaircase] = useState(false);
  const [isStaircase] = useState(false);
  const [showDpsHealth, setShowDpsHealth] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 56.25em)");
  const chartRef = useRef<ChartJS>(null);
  // const { classes } = useStyles();
  const theme = useMantineTheme();

  // create selection List
  if (unitSelectionList1.length == 0 && props.sbpsData.length > 0)
    unitSelectionList1 = mapUnitSelection(
      props.sbpsData,
      props.ebpsData,
      props.weaponData,
      unitFilter1,
      1,
    );
  if (unitSelectionList2.length == 0 && props.sbpsData.length > 0)
    unitSelectionList2 = mapUnitSelection(
      props.sbpsData,
      props.ebpsData,
      props.weaponData,
      unitFilter2,
      2,
    );

  useEffect(() => {
    const chart = chartRef.current;
    setScreenOptions(options, isLargeScreen);
    chart?.update();
  }, [isLargeScreen]);

  // Squad configration has changed
  function onSquadConfigChange() {
    setRerender(!rerender);
  }

  // synchronize selection field with presented units
  function onSelectionChange(selection: string, index: number) {
    // add new units

    // check if unit is already selected
    if (activeData[index]?.id == selection) return;

    // get blueprint
    let unitBp = unitSelectionList1.find((unit) => unit.id == selection);
    if (index == 1) unitBp = unitSelectionList2.find((unit) => unit.id == selection);

    // add unit
    if (unitBp) {
      activeData[index] = { ...unitBp };
      activeData[index].weapon_member = []; // Clear loadout reference
      for (const loadout of unitBp.weapon_member)
        activeData[index].weapon_member.push({ ...loadout });
      setRerender(!rerender);
    }
  }

  function toggleFilter(
    filterValue: string,
    unitIndex = 1,
    unitFilter: string[],
    unitSelectionList: CustomizableUnit[],
  ) {
    const filterValueIndex = unitFilter.indexOf(filterValue);

    if (filterValueIndex < 0) unitFilter.push(filterValue);
    else unitFilter.splice(filterValueIndex, 1);

    unitSelectionList.splice(0, unitSelectionList.length);

    if (unitIndex == 1) setFilter1([...unitFilter]);
    else setFilter2([...unitFilter]);
  }

  // default values
  const chartData = { datasets: [mapChartData([])] };
  let maxY = 1;

  for (const unit of activeData) if (unit) updateHealth(unit);

  if (activeData.length > 0) {
    chartData.datasets = [];

    // compute dps lines
    // should be an array of max two dps Lines;
    let dpsLines: any[] = [];
    if (!showDpsHealth) {
      dpsLines = getWeaponDPSData(activeData);
      options.scales.y.title.text = "Damage Per Second (DPS)";
    } else {
      options.scales.y.title.text = "DPS vs Health (%)";
      if (activeData[0])
        dpsLines[0] = getDpsVsHealth(props.ebpsData, activeData[0], activeData[1]);
      if (activeData[1])
        dpsLines[1] = getDpsVsHealth(props.ebpsData, activeData[1], activeData[0]);
    }

    //const selectItem = searchItems.searchData.find(item => item.value = activeData );

    if (activeData[0]) {
      const set = mapChartData(dpsLines[0], activeData[0].id, isStaircase);
      set.borderColor = theme.colors.blue[5];
      chartData.datasets.push(set);
      set.data.forEach((point: any) => {
        if (point.y > maxY) maxY = point.y;
      });
    }

    if (activeData[1]) {
      const set = mapChartData(dpsLines[1], activeData[1].id, isStaircase);
      set.borderColor = theme.colors.red[5];
      chartData.datasets.push(set);
      set.data.forEach((point: any) => {
        if (point.y > maxY) maxY = point.y;
      });
    }
  }
  // some scale buffer above the highest point
  maxY = maxY * 1.1;

  options.scales.y.suggestedMax = maxY;

  return (
    <>
      <Head>
        <title>CoH3 DPS - Calculator</title>
        <meta name="Damage Per Second (DPS) Calculator " />
      </Head>

      <Container>
        {/* */}

        <Title order={2}>Company of Heroes 3 DPS Benchmark Tool </Title>
        <Space></Space>

        <Space h="xl" />
        <>
          <Grid>
            <Grid.Col md={6} lg={6}>
              <SimpleGrid cols={2}>
                <Group>
                  {generateFilterButtons(unitFilter1, toggleFilter, 1, unitSelectionList1)}
                </Group>
                <Space h="2rem" />
              </SimpleGrid>
              <Space h="sm" />

              <UnitSearch
                key="Search1"
                searchData={unitSelectionList1}
                onSelect={onSelectionChange}
                position={0}
              ></UnitSearch>

              <Space h="sm" />

              {activeData[0] && (
                <Box
                  sx={(theme) => ({
                    backgroundColor:
                      theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.white,
                    border:
                      theme.colorScheme === "dark"
                        ? "solid 1px " + theme.colors.dark[4]
                        : "solid 2px " + theme.colors.blue[4],
                    textAlign: "left",
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.md,
                  })}
                >
                  <DpsUnitCustomizing
                    key={activeData[0].id + "0"}
                    unit={activeData[0]}
                    onChange={onSquadConfigChange}
                    index={0}
                    ebps={props.ebpsData}
                  ></DpsUnitCustomizing>
                </Box>
              )}
            </Grid.Col>

            <Grid.Col md={6} lg={6}>
              <SimpleGrid cols={2}>
                <Group>
                  {generateFilterButtons(unitFilter2, toggleFilter, 2, unitSelectionList2)}
                </Group>
                <Flex
                  // mih={50}
                  // gap="xs"
                  justify="flex-end"
                  //  align="center"
                  //direction="row"
                  wrap="wrap"
                >
                  <Space h="2rem" />
                  <Group>
                    <HoverCard width={400} shadow="md">
                      <HoverCard.Target>
                        <div>
                          <IconAdjustments opacity={0.6} />
                        </div>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Stack mb={12}>
                          {/* <Text size="sm">
                      {isStaircase
                        ? "Staircase: Show changes at near/mid/far only"
                        : "Line: Applied damage changes linearly over distance"}
                    </Text>
                    <Switch
                      label={isStaircase ? "Staircase" : "Line"}
                      checked={isStaircase}
                      onChange={(event) => setStaircase(event.currentTarget.checked)}
                      size="xs"
                    /> */}
                          <Space></Space>
                          <Text size="sm">
                            {showDpsHealth
                              ? "DPS(%)  : Estimated damage per second in %, respecting enemies health"
                              : "DPS  : Estimated damage per second"}
                          </Text>
                          <Switch
                            label={showDpsHealth ? "DPS(%)" : "DPS Simple"}
                            checked={showDpsHealth}
                            onChange={(event) => setShowDpsHealth(event.currentTarget.checked)}
                            //onClick={() => setCurve(isCurve)}
                            size="xs"
                          />
                        </Stack>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </Group>
                </Flex>
              </SimpleGrid>
              <Space h="sm" />

              <UnitSearch
                key="Search2"
                searchData={unitSelectionList2}
                onSelect={onSelectionChange}
                position={1}
              ></UnitSearch>

              <Space h="sm" />

              {activeData[1] && (
                <Box
                  sx={(theme) => ({
                    backgroundColor:
                      theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.white,
                    border:
                      theme.colorScheme === "dark"
                        ? "solid 1px " + theme.colors.dark[4]
                        : "solid 2px " + theme.colors.red[6],
                    textAlign: "left",
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.md,
                  })}
                >
                  <DpsUnitCustomizing
                    key={activeData[1].id + "1"}
                    unit={activeData[1]}
                    onChange={onSquadConfigChange}
                    index={0}
                    ebps={props.ebpsData}
                  ></DpsUnitCustomizing>
                </Box>
              )}
            </Grid.Col>
          </Grid>
        </>
      </Container>

      <Space h="sm" />
      <Container size="md">
        <Box
          sx={(theme) => ({
            backgroundColor:
              theme.colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.white,
            border:
              theme.colorScheme === "dark"
                ? "solid 1px " + theme.colors.dark[4]
                : "solid 1px " + theme.colors.gray[4],
            textAlign: "left",
            // padding: theme.spacing.xs,
            borderRadius: theme.radius.md,
          })}
        >
          <Line options={options as any} data={chartData as any} />
        </Box>
        <Space h="sm" />
      </Container>
    </>
  );
};
