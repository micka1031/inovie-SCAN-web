import React, { useEffect, useState } from 'react';
import { Select, Spin } from 'antd';
import { usePoles, Pole } from '../services/PoleService';

const { Option } = Select;

interface PoleSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  allowClear?: boolean;
  showSearch?: boolean;
  className?: string;
  required?: boolean;
  filterBySelas?: boolean;
  currentSelasId?: string | null;
  useIdAsValue?: boolean;
  title?: string;
}

/**
 * Composant de sélection de pôle réutilisable
 */
const PoleSelector: React.FC<PoleSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Sélectionner un pôle',
  style,
  disabled = false,
  allowClear = true,
  showSearch = true,
  className,
  required = false,
  filterBySelas = false,
  currentSelasId = null,
  useIdAsValue = true,
  title
}) => {
  const { poles, loading, error } = usePoles();
  const [filteredPoles, setFilteredPoles] = useState<Pole[]>([]);
  
  // Filtrer les pôles par SELAS si nécessaire
  useEffect(() => {
    if (filterBySelas && currentSelasId) {
      setFilteredPoles(poles.filter(pole => 
        pole.selasId === currentSelasId || !pole.selasId
      ));
    } else {
      setFilteredPoles(poles);
    }
  }, [poles, filterBySelas, currentSelasId]);
  
  const handleChange = (value: string) => {
    if (onChange) {
      onChange(value);
    }
  };
  
  if (error) {
    console.error("Erreur lors du chargement des pôles:", error);
    return (
      <Select
        className={className}
        style={style}
        disabled={true}
        placeholder="Erreur de chargement"
        title={title}
      />
    );
  }
  
  return (
    <Select
      className={className}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      style={{ width: 200, ...style }}
      disabled={disabled || loading}
      allowClear={allowClear}
      showSearch={showSearch}
      filterOption={(input, option) =>
        option?.children?.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0
      }
      notFoundContent={loading ? <Spin size="small" /> : "Aucun pôle trouvé"}
      title={title}
    >
      {filteredPoles.map(pole => (
        <Option key={pole.id} value={useIdAsValue ? pole.id : pole.nom}>
          {pole.nom}
        </Option>
      ))}
    </Select>
  );
};

export default PoleSelector; 
