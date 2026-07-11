import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';

export interface DropdownDetail {
  label: string;
  value: string | number;
}

export interface DropdownItem {
  id: string | number;
  title: string;
  subtitle?: React.ReactNode;
  details: DropdownDetail[];
  detailsLine?: React.ReactNode | ((isSelected: boolean) => React.ReactNode);
  rawData: any;
}

interface SmartDetailDropdownProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (rawData: any) => void;
  items: DropdownItem[];
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  required?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SmartDetailDropdown = ({
  id,
  value,
  onChange,
  onSelect,
  items,
  placeholder = '',
  className = '',
  isLoading = false,
  required = false,
  onFocus,
  onBlur,
}: SmartDetailDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; bottom: number }>({
    top: 0,
    left: 0,
    width: 0,
    bottom: 0,
  });

  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        bottom: rect.bottom,
      });
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedInsideContainer = containerRef.current && containerRef.current.contains(event.target as Node);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target as Node);
      if (!clickedInsideContainer && !clickedInsideDropdown) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update coords on open, resize, or scroll
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        onSelect(items[activeIndex].rawData);
        setIsOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    onSelect(item.rawData);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setIsOpen(true);
          setActiveIndex(-1);
          if (onFocus) onFocus();
        }}
        onBlur={() => {
          if (onBlur) onBlur();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`border-gold focus:ring-saffron w-full bg-white dark:bg-gray-800 ${className}`}
        autoComplete="off"
        required={required}
      />

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="overflow-y-auto rounded-xl border border-[#D4A017] bg-[#F8F4E8] py-1 text-[#3A1F12] scrollbar-thin scrollbar-thumb-gold/50 scrollbar-track-transparent animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            position: 'fixed',
            top: `${coords.bottom + 8}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: '280px',
            zIndex: 99999,
            boxShadow: '0 18px 40px rgba(0,0,0,0.22)'
          }}
        >
          {isLoading ? (
            <div className="px-4 py-3 text-xs text-slate-500 font-medium italic text-center">
              Loading records...
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 font-semibold italic text-center">
              No matching records found
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    // Prevent input blur before click registers
                    e.preventDefault();
                  }}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-3 text-xs transition-colors duration-150 border-b border-[#C89B3C]/20 last:border-b-0 flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#7A0019] text-white'
                      : 'hover:bg-[#EFE4D2]/60 text-[#3A1F12]'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`font-serif font-bold text-sm ${isSelected ? 'text-white' : 'text-[#7A0019]'}`}>
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <div className="flex-shrink-0 ml-2">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  {item.detailsLine ? (
                    <div className="w-full">
                      {typeof item.detailsLine === 'function' ? item.detailsLine(isSelected) : item.detailsLine}
                    </div>
                  ) : item.details.length > 0 ? (
                    <div className="flex flex-col gap-0.5 text-[11px] font-medium w-full text-left">
                      {item.details.map((detail, dIdx) => (
                        <div key={dIdx} className="flex justify-between w-full gap-2">
                          <span className={isSelected ? 'text-white/70' : 'text-slate-500'}>
                            {detail.label}:
                          </span>
                          <span className="truncate max-w-[220px] md:max-w-[300px] text-right">
                            {detail.value || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
