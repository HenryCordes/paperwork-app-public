import styled from "@emotion/styled";
import { IonNote } from "@ionic/react";

// Responsive note that adapts its styling based on content length
export const ResponsiveSizeNote = styled(IonNote)<{ isLong: boolean }>`
  font-size: ${(props) => (props.isLong ? "14px" : "16px")};
  white-space: ${(props) => (props.isLong ? "normal" : "nowrap")};
  overflow: ${(props) => (props.isLong ? "visible" : "hidden")};
  text-overflow: ${(props) => (props.isLong ? "clip" : "ellipsis")};
  max-width: 60%;
  padding-left: ${(props) => (props.isLong ? "4px" : "0")};

  @media (max-width: 376px) {
    font-size: ${(props) => (props.isLong ? "12px" : "14px")};
    max-width: 50%;
  }
`;
