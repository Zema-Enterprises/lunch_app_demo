import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

type OptionItem = {
  value: string;
  label: string;
  node: React.ReactNode;
  disabled: boolean;
};

function parseOptions(children: React.ReactNode): OptionItem[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child) || child.type !== 'option') {
      return [];
    }

    const rawValue = child.props.value ?? child.props.children ?? '';
    const value = typeof rawValue === 'string' ? rawValue : String(rawValue);
    const label = React.Children.toArray(child.props.children)
      .map((node) => (typeof node === 'string' ? node : ''))
      .join('')
      .trim();

    return [
      {
        value,
        label: label || value,
        node: child.props.children ?? value,
        disabled: Boolean(child.props.disabled),
      },
    ];
  });
}

const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>((props, forwardedRef) => {
  const {
    className,
    children,
    onChange,
    value,
    defaultValue,
    disabled,
    id,
    name,
    required,
    onBlur,
    onFocus,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    ...rest
  } = props;

  const options = React.useMemo(() => parseOptions(children), [children]);
  const optionSignature = React.useMemo(
    () => options.map((option) => `${option.value}:${option.label}`).join('|'),
    [options]
  );
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(() => {
    if (value !== undefined) return String(value);
    if (defaultValue !== undefined) return String(defaultValue);
    const firstEnabled = options.find((option) => !option.disabled);
    return firstEnabled ? firstEnabled.value : '';
  });

  React.useEffect(() => {
    if (isControlled) {
      setInternalValue(value !== undefined ? String(value) : '');
    }
  }, [isControlled, value]);

  const currentValue = isControlled ? String(value ?? '') : internalValue;

  const hiddenSelectRef = React.useRef<HTMLSelectElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const optionLabelRefs = React.useRef(new Map<number, HTMLSpanElement>());
  const [isOpen, setIsOpen] = React.useState(false);
  const [truncatedOptions, setTruncatedOptions] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (isControlled) {
      return;
    }

    if (!options.some((option) => option.value === internalValue)) {
      const fallback = options.find((option) => !option.disabled)?.value ?? '';
      setInternalValue(fallback);
    }
  }, [internalValue, isControlled, options]);
  const [activeIndex, setActiveIndex] = React.useState<number>(() => {
    const initialIndex = options.findIndex((option) => option.value === currentValue);
    return initialIndex >= 0 ? initialIndex : 0;
  });

  React.useEffect(() => {
    const index = options.findIndex((option) => option.value === currentValue);
    setActiveIndex(index >= 0 ? index : 0);
  }, [currentValue, options]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const setHiddenSelectRef = React.useCallback(
    (node: HTMLSelectElement | null) => {
      hiddenSelectRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  const commitValue = React.useCallback(
    (nextValue: string) => {
      const selectEl = hiddenSelectRef.current;
      if (!selectEl) {
        return;
      }

      if (selectEl.value !== nextValue) {
        selectEl.value = nextValue;
      }

      const changeEvent = new Event('change', { bubbles: true });
      selectEl.dispatchEvent(changeEvent);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    []
  );

  const handleHiddenChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!isControlled) {
        setInternalValue(event.target.value);
      }
      onChange?.(event);
    },
    [isControlled, onChange]
  );

  const moveActiveIndex = React.useCallback(
    (direction: 1 | -1) => {
      if (!options.length) return;

      let nextIndex = activeIndex;
      let safety = 0;
      do {
        nextIndex = (nextIndex + direction + options.length) % options.length;
        safety += 1;
        if (safety > options.length) {
          return;
        }
      } while (options[nextIndex]?.disabled);

      setActiveIndex(nextIndex);
    },
    [activeIndex, options]
  );

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        moveActiveIndex(1);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        moveActiveIndex(-1);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      const firstEnabled = options.findIndex((option) => !option.disabled);
      if (firstEnabled >= 0) {
        setActiveIndex(firstEnabled);
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      for (let i = options.length - 1; i >= 0; i -= 1) {
        if (!options[i]?.disabled) {
          setActiveIndex(i);
          break;
        }
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const option = options[activeIndex];
        if (option && !option.disabled) {
          commitValue(option.value);
        }
      }
    } else if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    }
  };

  const selectedOption = options.find((option) => option.value === currentValue) ?? null;

  const measureTruncation = React.useCallback(() => {
    const next: Record<number, boolean> = {};
    optionLabelRefs.current.forEach((node, index) => {
      const isTruncated = node.scrollWidth > node.clientWidth + 1;
      if (isTruncated) {
        next[index] = true;
      }
    });

    setTruncatedOptions((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length) {
        let unchanged = true;
        for (const key of nextKeys) {
          if (!prev[Number(key)]) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) {
          for (const key of prevKeys) {
            if (!next[Number(key)]) {
              unchanged = false;
              break;
            }
          }
        }
        if (unchanged) {
          return prev;
        }
      }
      return next;
    });
  }, []);

  const assignOptionLabelRef = React.useCallback(
    (index: number, node: HTMLSpanElement | null) => {
      if (node) {
        optionLabelRefs.current.set(index, node);
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => measureTruncation());
        } else {
          measureTruncation();
        }
      } else {
        optionLabelRefs.current.delete(index);
        setTruncatedOptions((prev) => {
          if (!prev[index]) {
            return prev;
          }
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    },
    [measureTruncation]
  );

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(() => measureTruncation())
      : undefined;

    const handleResize = () => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => measureTruncation());
      } else {
        measureTruncation();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (frame !== undefined && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, optionSignature, measureTruncation]);

  const renderOptionLabel = (option: OptionItem) => {
    if (option.node && typeof option.node !== 'string') {
      return option.node;
    }
    return option.label;
  };

  return (
    <div className="relative" ref={containerRef}>
      <select
        {...rest}
        id={id ? `${id}-native` : undefined}
        name={name}
        required={required}
        value={currentValue}
        onChange={handleHiddenChange}
        disabled={disabled}
        ref={setHiddenSelectRef}
        style={visuallyHiddenStyle}
        aria-hidden="true"
        tabIndex={-1}
      >
        {children}
      </select>

      <button
        type="button"
        id={id}
        ref={triggerRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-activedescendant={
          isOpen && options[activeIndex]
            ? `${id ?? 'select'}-option-${activeIndex}`
            : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        onBlur={onBlur as unknown as React.FocusEventHandler<HTMLButtonElement>}
        onFocus={onFocus as unknown as React.FocusEventHandler<HTMLButtonElement>}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <span className="truncate">
          {selectedOption?.label ?? 'Select an option'}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 text-slate-500" aria-hidden="true" />
      </button>

      {isOpen && options.length > 0 && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
        >
          {options.map((option, index) => {
            const isSelected = option.value === currentValue;
            const isActive = index === activeIndex;
            return (
              <li
                key={`${option.value}-${index}`}
                id={id ? `${id}-option-${index}` : undefined}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer select-none flex items-center gap-2',
                  isSelected && 'bg-slate-100 text-slate-900 font-medium',
                  isActive && !option.disabled && 'bg-slate-100',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => {
                  if (!option.disabled) {
                    setActiveIndex(index);
                  }
                }}
                onClick={() => {
                  if (!option.disabled) {
                    commitValue(option.value);
                  }
                }}
                title={truncatedOptions[index] ? option.label : undefined}
              >
                <span
                  className="truncate flex-1 min-w-0"
                  aria-hidden={typeof option.node !== 'string'}
                  ref={(node) => assignOptionLabelRef(index, node)}
                >
                  {renderOptionLabel(option)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {isOpen && options.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
          No options available
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export { Select };
