import styled from "@emotion/styled";
import { DASHBOARD_CHART_MARGINS_WIDTH } from "../../../common/versionConstants";

export const DashBoardChartScrollContainer = styled.div<{ width?: number }>`
  height: 350px;
  width: ${(props) => (props.width ? props.width + "px" : "100%")};
`;

export const IconWrapper = styled.div`
  flex-shrink: 0;
  margin-right: 4px;
  display: flex;
  align-items: center;
  /* Match Ionic icon colors */
  color: inherit;
`;

export const DashboardChart = styled.div`
  width: calc(100vw - ${DASHBOARD_CHART_MARGINS_WIDTH}px);
  height: 350px;
  overflow-x: auto;
`;
