import styled from "@emotion/styled";
import { isPlatform } from "@ionic/react";

export const SelectContainer = styled.div`
  position: relative;
  width: 100%;
  ${isPlatform("android") && "margin-top: 0.1rem;"}

  .select-input {
    --padding-start: var(--padding-start, 16px);
    --padding-end: var(--padding-end, 16px);
    --padding-top: var(--padding-top, 8px);
    --padding-bottom: var(--padding-bottom, 8px);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .add-new-button {
    margin: 16px;
  }

  .option-image {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 4px;
    margin-right: 8px;
  }
`;

export const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(77, 77, 77, 0.4);
  z-index: 99998; /* Very high z-index to ensure it's above all other content */
  animation: fadeIn 0.2s ease;
`;

export const BottomSheet = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70vh;
  max-height: 600px;
  background-color: var(--ion-background-color, #fff);
  border-radius: 16px 16px 0 0;
  box-shadow: 0px -4px 10px rgba(0, 0, 0, 0.1);
  z-index: 99999; /* Very high z-index to ensure it's above everything else */
  transition: transform 0.3s ease-out;
  transform: translateY(100%);
  display: flex;
  flex-direction: column;

  &.open {
    transform: translateY(0);
  }

  .bottom-sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 16px 12px 16px;
    border-bottom: 1px solid
      var(
        --ion-item-border-color,
        var(
          --ion-border-color,
          var(
            --ion-color-step-250,
            var(--ion-background-color-step-250, #c8c7cc)
          )
        )
      );
    border-radius: 16px 16px 0 0;
  }

  .bottom-sheet-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .close-button {
    background: transparent;
    border: none;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }

  .bottom-sheet-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0 20px 0;
  }

  .search-container {
    padding: 12px 16px 16px;
  }

  .search-input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid
      var(
        --ion-item-border-color,
        var(
          --ion-border-color,
          var(
            --ion-color-step-250,
            var(--ion-background-color-step-250, #c8c7cc)
          )
        )
      );
    font-size: 16px;
    outline: none;
    background-color: var(--ion-background-color, #fff);
  }

  .options-list {
    overflow-y: auto;
  }

  .option-item {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    cursor: pointer;

    &:active {
      background-color: var(--ion-color-light-shade, #d7d8da);
    }
  }

  .option-icon {
    margin-right: 12px;
  }

  .option-label {
    flex: 1;
  }

  .no-results {
    padding: 16px;
    text-align: center;
    color: var(--ion-color-medium, #92949c);
  }

  .add-button {
    margin: 16px;
    width: calc(100% - 32px);
    padding: 12px;
    background-color: var(--ion-color-primary, #3880ff);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;

    &:active {
      background-color: var(--ion-color-primary-shade, #3171e0);
    }
  }
`;
