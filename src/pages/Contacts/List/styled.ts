import styled from "@emotion/styled";

export const IconTextContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  overflow: hidden;
  height: 24px;
  flex-wrap: nowrap;
  margin: 8px 0;
  /* Inherit Ionic paragraph styling */
  font-size: inherit;
  color: var(--ion-color-step-600, #666666);
`;

export const IconWrapper = styled.div`
  flex-shrink: 0;
  margin-right: 4px;
  display: flex;
  align-items: center;
  /* Match Ionic icon colors */
  color: inherit;
`;

export const TruncatedText = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
  color: inherit;
  font-size: inherit;
`;
