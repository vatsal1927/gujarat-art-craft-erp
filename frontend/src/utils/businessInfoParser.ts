export interface ParsedBusinessInfo {
  name: string;
  address: string;
  phone: string;
  gst: string;
}

export function parseBusinessInfo(businessInfoStr: string): ParsedBusinessInfo {
  let name = 'Gujarat Art & Crafts';
  let address = '';
  let phone = '';
  let gst = '';

  const cleanInfo = (businessInfoStr || '').trim();
  let parsedJson = false;

  if (cleanInfo.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanInfo);
      name = parsed.name || 'Gujarat Art & Crafts';
      address = parsed.address || '';
      phone = parsed.phone || '';
      gst = parsed.gst || '';
      parsedJson = true;
    } catch (e) {
      // JSON parse failed, try robust regex extraction (e.g. if truncated)
      const matchKey = (key: string) => {
        const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
        const match = cleanInfo.match(regex);
        return match ? match[1].replace(/\\(.)/g, '$1') : null;
      };

      const parsedName = matchKey('name');
      const parsedAddress = matchKey('address');
      const parsedPhone = matchKey('phone');
      const parsedGst = matchKey('gst');

      if (parsedName !== null || parsedAddress !== null || parsedPhone !== null || parsedGst !== null) {
        name = parsedName || 'Gujarat Art & Crafts';
        address = parsedAddress || '';
        phone = parsedPhone || '';
        gst = parsedGst || '';
        parsedJson = true;
      }
    }
  }

  if (!parsedJson) {
    const parts = cleanInfo.split('|');
    name = parts[0] || 'Gujarat Art & Crafts';
    address = parts[1] || '';
    phone = parts[2] || '';
    gst = parts[3] || '';
  }

  // Normalize the business name if it matches variants
  if (
    name === 'Gujarat Art & Craft' || 
    name === 'Gujarat Art & Crafts' || 
    name === 'Gujarat Arts & Craft' || 
    name === 'Gujarat Arts & Crafts'
  ) {
    name = 'Gujarat Art & Crafts';
  }

  return { name, address, phone, gst };
}
