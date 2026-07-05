import React from 'react';
import { IonButtons, IonMenuButton, IonIcon } from '@ionic/react';
import { menuOutline } from 'ionicons/icons';

const MenuButton: React.FC = () => {
  return (
    <IonButtons slot="start">
      <IonMenuButton>
        <IonIcon icon={menuOutline} />
      </IonMenuButton>
    </IonButtons>
  );
};

export default MenuButton;
