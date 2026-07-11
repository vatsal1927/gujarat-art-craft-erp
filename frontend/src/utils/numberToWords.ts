export function numberToWords(amount: number): string {
    if (amount === 0) return "INR Zero Only";
    
    // Split integer and decimal parts
    const parts = amount.toFixed(2).split('.');
    const integerPart = parseInt(parts[0], 10);
    const decimalPart = parseInt(parts[1], 10);

    const units = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", 
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function convertLessThanThousand(n: number): string {
        let str = "";
        if (n >= 100) {
            str += units[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + " ";
            n %= 10;
        }
        if (n > 0) {
            str += units[n] + " ";
        }
        return str.trim();
    }

    function convertInteger(n: number): string {
        if (n === 0) return "";
        let str = "";
        
        // Crore (1,00,00,000)
        if (n >= 10000000) {
            str += convertInteger(Math.floor(n / 10000000)) + " Crore ";
            n %= 10000000;
        }
        // Lakh (1,00,000)
        if (n >= 100000) {
            str += convertLessThanThousand(Math.floor(n / 100000)) + " Lakh ";
            n %= 100000;
        }
        // Thousand (1,000)
        if (n >= 1000) {
            str += convertLessThanThousand(Math.floor(n / 1000)) + " Thousand ";
            n %= 1000;
        }
        // Hundreds, Tens, Units
        if (n > 0) {
            str += convertLessThanThousand(n) + " ";
        }
        return str.trim();
    }

    let result = "INR " + convertInteger(integerPart);

    if (decimalPart > 0) {
        result += " and " + convertLessThanThousand(decimalPart) + " Paise";
    }

    result += " Only";
    return result.replace(/\s+/g, ' ');
}
