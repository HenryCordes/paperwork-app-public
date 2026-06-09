import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonLabel,
  IonText,
} from '@ionic/react';
import { CategoryBreakdown as CategoryBreakdownType } from '../../../api/types/dashboard';
import { formatCurrency, formatPercentage } from '../../../utils/formatters';

interface CategoryBreakdownProps {
  title: string;
  data: CategoryBreakdownType[];
  isDarkMode: boolean;
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ 
  title, 
  data,
  isDarkMode
}) => {
  // Generate different colors for categories
  const generateColor = (index: number, isDarkMode: boolean) => {
    const baseColors = [
      ['#3B82F6', '#60A5FA'], // blue
      ['#10B981', '#34D399'], // green
      ['#F59E0B', '#FBBF24'], // amber
      ['#8B5CF6', '#A78BFA'], // purple
      ['#EC4899', '#F472B6'], // pink
      ['#EF4444', '#F87171'], // red
      ['#06B6D4', '#22D3EE'], // cyan
    ];
    
    // Use modulo to cycle through colors if we have more categories than colors
    const colorPair = baseColors[index % baseColors.length];
    return isDarkMode ? colorPair[1] : colorPair[0];
  };

  // Sort data by amount in descending order
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  if (sortedData.length === 0) {
    return (
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>{title}</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <IonText color="medium">No data available</IonText>
        </IonCardContent>
      </IonCard>
    );
  }

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>{title}</IonCardTitle>
      </IonCardHeader>
      <IonCardContent>
        <IonList lines="none">
          {sortedData.map((item, index) => (
            <div className="category-item" key={item.category}>
              <div style={{ flex: 1 }}>
                <IonLabel>{item.category}</IonLabel>
                <div 
                  className="category-bar" 
                  style={{ 
                    width: `${item.percentage * 100}%`,
                    backgroundColor: generateColor(index, isDarkMode)
                  }}
                />
              </div>
              <div className="ion-text-right">
                <div className="category-amount">{formatCurrency(item.amount)}</div>
                <div className="category-percentage">{formatPercentage(item.percentage)}</div>
              </div>
            </div>
          ))}
        </IonList>
      </IonCardContent>
    </IonCard>
  );
};

export default CategoryBreakdown;
