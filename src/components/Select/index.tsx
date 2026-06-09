import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { IonItem, IonInput, IonIcon } from "@ionic/react";
import { chevronDownOutline, closeOutline } from "ionicons/icons";
import { SelectContainer, BottomSheet, Backdrop } from "./styled";

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: string;
  image?: string;
}

export interface SelectProps {
  value?: string | number;
  placeholder?: string;
  label: string;
  options: SelectOption[];
  disabled?: boolean;
  searchable?: boolean;
  onIonChange?: (event: CustomEvent) => void;
  onChange?: (value: string | number) => void;
  onAddNew?: () => void;
  showAddButton?: boolean;
}

const Select: React.FC<SelectProps> = ({
  value,
  placeholder = "Selecteer een optie",
  label,
  options,
  disabled = false,
  searchable = true,
  onIonChange,
  onChange,
  onAddNew,
  showAddButton = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filteredOptions, setFilteredOptions] =
    useState<SelectOption[]>(options);
  const bottomSheetRef = useRef<HTMLDivElement>(null);

  // Find the selected option based on the current value
  const selectedOption = options.find((option) => option.value === value);

  // Filter options when search text changes
  useEffect(() => {
    if (!searchText) {
      setFilteredOptions(options);
      return;
    }

    const filtered = options.filter((option) =>
      option.label.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchText, options]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearchText("");
    setFilteredOptions(options);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSelect = (option: SelectOption) => {
    if (onIonChange) {
      const customEvent = new CustomEvent("ionChange", {
        detail: {
          value: option.value,
        },
      });
      onIonChange(customEvent);
    }

    if (onChange) {
      onChange(option.value);
    }

    handleClose();
  };

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew();
      handleClose();
    }
  };

  // Animation for bottom sheet
  useEffect(() => {
    const bottomSheet = bottomSheetRef.current;
    if (!bottomSheet) return;

    if (isOpen) {
      bottomSheet.style.transform = "translateY(0)";
    } else {
      bottomSheet.style.transform = "translateY(100%)";
    }
  }, [isOpen]);

  return (
    <SelectContainer>
      {/* Input field that shows the selected value */}
      <IonItem
        lines="full"
        // button
        disabled={disabled}
        onClick={handleOpen}
        className="select-input"
      >
        <IonInput
          value={selectedOption?.label || ""}
          placeholder={placeholder}
          readonly
          disabled={disabled}
        />
        <IonIcon slot="end" icon={chevronDownOutline} />
      </IonItem>

      {isOpen &&
        createPortal(
          <>
            <Backdrop onClick={handleClose} />
            <BottomSheet ref={bottomSheetRef} className={isOpen ? "open" : ""}>
              <div className="bottom-sheet-header">
                <h3 className="bottom-sheet-title">
                  {label || "Selecteer een optie"}
                </h3>
                <button className="close-button" onClick={handleClose}>
                  <IonIcon icon={closeOutline} />
                </button>
              </div>

              <div className="bottom-sheet-content">
                {searchable && (
                  <div className="search-container">
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder={`Zoek naar ${label.toLowerCase()}...`}
                      className="search-input"
                    />
                  </div>
                )}

                <div className="options-list">
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className="option-item"
                      onClick={() => handleSelect(option)}
                    >
                      {option.icon && (
                        <IonIcon icon={option.icon} className="option-icon" />
                      )}
                      {option.image && (
                        <img
                          src={option.image}
                          alt={option.label}
                          className="option-image"
                        />
                      )}
                      <span className="option-label">{option.label}</span>
                    </div>
                  ))}

                  {filteredOptions.length === 0 && (
                    <div className="no-results">
                      Geen {label.toLowerCase()} gevonden
                    </div>
                  )}
                </div>

                {showAddButton && (
                  <button className="add-button" onClick={handleAddNew}>
                    Nieuw {label.toLowerCase()} toevoegen
                  </button>
                )}
              </div>
            </BottomSheet>
          </>,
          document.body
        )}
    </SelectContainer>
  );
};

export default Select;
