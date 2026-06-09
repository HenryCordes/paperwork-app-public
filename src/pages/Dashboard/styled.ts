import styled from "@emotion/styled";
import { DASHBOARD_CHART_MARGINS_WIDTH } from "../../common/versionConstants";
import { IonCardSubtitle } from "@ionic/react";

export const DashboardChartContainer = styled.div`
  position: relative;
  width: calc(100vw - ${DASHBOARD_CHART_MARGINS_WIDTH}px);
  min-height: 350px;
`;

export const CardSubtitle = styled(IonCardSubtitle)<{ smallScreen?: boolean }>`
  font-size: ${(props) => (props.smallScreen ? "0.65rem" : "0.875rem")};
  font-weight: 500;
`;

export const SingleValue = styled.span<{ smallScreen?: boolean }>`
  font-size: ${(props) => (props.smallScreen ? "0.7rem" : "1rem")};
  margin-left: 0;
  margin-right: 0;
  margin-top: 2px;
  margin-bottom: 2px;
  font-weight: normal;
`;
