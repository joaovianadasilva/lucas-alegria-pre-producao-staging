import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTecnicos } from '@/hooks/useTecnicos';

interface TecnicoSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  required?: boolean;
}

export const TecnicoSelector: React.FC<TecnicoSelectorProps> = ({
  value,
  onValueChange,
  required = false,
}) => {
  const { data: tecnicos, isLoading } = useTecnicos();

  return (
    <div className="space-y-2">
      <Label htmlFor="tecnico">
        Técnico Responsável {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger id="tecnico">
          <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um técnico"} />
        </SelectTrigger>
        <SelectContent>
          {tecnicos?.map((tecnico) => (
            <SelectItem key={tecnico.id} value={tecnico.id}>
              {tecnico.nome} {tecnico.sobrenome}
              {tecnico.telefone && ` - ${tecnico.telefone}`}
            </SelectItem>
          ))}
          {tecnicos?.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground">
              Nenhum técnico disponível
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
