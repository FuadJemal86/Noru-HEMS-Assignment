import * as React from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Country data with flags and phone number length limits (using emoji flags)
// Format: { code, name, dialCode, flag, minLength, maxLength }
// minLength and maxLength are for the number part AFTER the country code
const countries = [
    { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", minLength: 9, maxLength: 9 },
    { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", minLength: 10, maxLength: 10 },
    { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", minLength: 10, maxLength: 10 },
    { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", minLength: 10, maxLength: 10 },
    { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿", minLength: 8, maxLength: 9 },
    { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", minLength: 10, maxLength: 10 },
    { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳", minLength: 11, maxLength: 11 },
    { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵", minLength: 10, maxLength: 10 },
    { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷", minLength: 9, maxLength: 10 },
    { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", minLength: 8, maxLength: 8 },
    { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾", minLength: 9, maxLength: 10 },
    { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭", minLength: 10, maxLength: 10 },
    { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩", minLength: 9, maxLength: 11 },
    { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭", minLength: 9, maxLength: 9 },
    { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳", minLength: 9, maxLength: 10 },
    { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", minLength: 10, maxLength: 11 },
    { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", minLength: 9, maxLength: 9 },
    { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹", minLength: 9, maxLength: 10 },
    { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸", minLength: 9, maxLength: 9 },
    { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱", minLength: 9, maxLength: 9 },
    { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪", minLength: 9, maxLength: 9 },
    { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭", minLength: 9, maxLength: 9 },
    { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹", minLength: 10, maxLength: 13 },
    { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪", minLength: 7, maxLength: 9 },
    { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴", minLength: 8, maxLength: 8 },
    { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰", minLength: 8, maxLength: 8 },
    { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮", minLength: 5, maxLength: 10 },
    { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱", minLength: 9, maxLength: 9 },
    { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹", minLength: 9, maxLength: 9 },
    { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷", minLength: 10, maxLength: 10 },
    { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪", minLength: 9, maxLength: 9 },
    { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷", minLength: 10, maxLength: 11 },
    { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽", minLength: 10, maxLength: 10 },
    { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷", minLength: 10, maxLength: 10 },
    { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱", minLength: 9, maxLength: 9 },
    { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴", minLength: 10, maxLength: 10 },
    { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪", minLength: 9, maxLength: 9 },
    { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", minLength: 9, maxLength: 9 },
    { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬", minLength: 10, maxLength: 10 },
    { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬", minLength: 10, maxLength: 10 },
    { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪", minLength: 9, maxLength: 9 },
    { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", minLength: 9, maxLength: 9 },
    { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", minLength: 9, maxLength: 9 },
    { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷", minLength: 10, maxLength: 10 },
    { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺", minLength: 10, maxLength: 10 },
];

// Export countries for use in validation
export const getCountryByCode = (code: string) => countries.find((c) => c.code === code);
export const getCountryByDialCode = (dialCode: string) => {
    if (!dialCode) return undefined;
    // Sort by dial code length (longest first) to match more specific codes first
    // e.g., +358 (Finland) should match before +3 (if it existed)
    const sortedCountries = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
    return sortedCountries.find((c) => dialCode.startsWith(c.dialCode));
};

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
    value?: string;
    onChange?: (value: string) => void;
    defaultCountry?: string;
}

export function PhoneInput({ value = "", onChange, defaultCountry = "AU", className, ...props }: PhoneInputProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedCountry, setSelectedCountry] = React.useState(() => {
        return countries.find((c) => c.code === defaultCountry) || countries[0];
    });
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Parse current value to extract country code and phone number
    React.useEffect(() => {
        if (value) {
            // Try to find matching country code (sort by length to match longest first)
            const sortedCountries = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
            const matchingCountry = sortedCountries.find((country) => value.startsWith(country.dialCode));
            if (matchingCountry && matchingCountry.code !== selectedCountry.code) {
                setSelectedCountry(matchingCountry);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
                setSearchQuery("");
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const handleCountrySelect = (country: typeof countries[0]) => {
        // Update selected country
        setSelectedCountry(country);

        // Close the dropdown
        setOpen(false);
        setSearchQuery("");

        // Update phone number with new country code
        // Keep existing number part if it exists, otherwise start fresh
        const currentNumber = value ? value.replace(/^\+\d+/, "").trim() : "";
        // Limit number to new country's max length
        const limitedNumber = currentNumber.slice(0, country.maxLength);
        const newValue = country.dialCode + limitedNumber;
        onChange?.(newValue);
    };

    // Filter countries based on search query
    const filteredCountries = React.useMemo(() => {
        if (!searchQuery.trim()) {
            return countries;
        }
        const query = searchQuery.toLowerCase();
        return countries.filter(
            (c) =>
                c.name.toLowerCase().includes(query) ||
                c.dialCode.includes(query) ||
                c.code.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Remove any non-digit characters except +
        const cleaned = inputValue.replace(/[^\d+]/g, "");

        // If starts with country code, keep it, otherwise prepend selected country code
        if (cleaned.startsWith("+")) {
            // Check if it matches any country code (sort by length to match longest first)
            const sortedCountries = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
            const matchingCountry = sortedCountries.find((country) => cleaned.startsWith(country.dialCode));
            if (matchingCountry) {
                setSelectedCountry(matchingCountry);
                // Get number part (after country code)
                const numberPart = cleaned.replace(matchingCountry.dialCode, "");
                // Limit to max length for this country
                const limitedNumber = numberPart.slice(0, matchingCountry.maxLength);
                onChange?.(matchingCountry.dialCode + limitedNumber);
            } else {
                // Invalid country code, use selected country code
                const numberOnly = cleaned.replace(/^\+\d+/, "");
                // Limit to max length for selected country
                const limitedNumber = numberOnly.slice(0, selectedCountry.maxLength);
                onChange?.(selectedCountry.dialCode + limitedNumber);
            }
        } else {
            // No country code, prepend selected one
            // Limit to max length for selected country
            const limitedNumber = cleaned.slice(0, selectedCountry.maxLength);
            onChange?.(selectedCountry.dialCode + limitedNumber);
        }
    };

    const displayValue = value.startsWith(selectedCountry.dialCode)
        ? value.replace(selectedCountry.dialCode, "").trim()
        : value.replace(/^\+\d+/, "").trim();

    return (
        <div className={cn("flex gap-2 relative", className)} ref={dropdownRef}>
            {/* Country Selector Button */}
            <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(!open)}
                className="w-[140px] justify-between shrink-0"
            >
                <span className="flex items-center gap-2">
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-sm">{selectedCountry.dialCode}</span>
                </span>
                <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
            </Button>

            {/* Dropdown Menu */}
            {open && (
                <div className="absolute top-full left-0 mt-1 w-[300px] bg-popover border border-border rounded-md shadow-lg z-50">
                    {/* Search Input */}
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search country..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {filteredCountries.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No country found.
                            </div>
                        ) : (
                            <div className="p-1">
                                {filteredCountries.map((country) => (
                                    <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => handleCountrySelect(country)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer transition-colors",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            selectedCountry.code === country.code && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        <span className="text-lg">{country.flag}</span>
                                        <span className="flex-1 text-left">{country.name}</span>
                                        <span className="text-sm text-muted-foreground">{country.dialCode}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Phone Number Input */}
            <Input
                type="tel"
                value={displayValue}
                onChange={handlePhoneChange}
                placeholder="Phone number"
                className="flex-1"
                maxLength={selectedCountry.maxLength}
                {...props}
            />
        </div>
    );
}
