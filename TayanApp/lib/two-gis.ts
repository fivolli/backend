import { Linking } from 'react-native';

type Open2GisRouteArgs = {
	toLat: number;
	toLng: number;
	fromLat?: number | null;
	fromLng?: number | null;
	zoom?: number;
};

async function tryOpen(url: string) {
	try {
		await Linking.openURL(url);
		return true;
	} catch {
		return false;
	}
}

export async function open2GisPoint(args: { lat: number; lng: number; zoom?: number }) {
	const lat = Number(args.lat);
	const lng = Number(args.lng);
	const zoom = Number.isFinite(Number(args.zoom)) ? Number(args.zoom) : 16;
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

	
	const web = `https://2gis.ru/?m=${encodeURIComponent(`${lng},${lat}/${zoom}`)}`;
	return tryOpen(web);
}

export async function open2GisSearch(query: string) {
	const q = String(query || '').trim();
	if (!q) return false;
	
	return tryOpen(`https://2gis.ru/search/${encodeURIComponent(q)}`);
}

export async function open2GisRoute(args: Open2GisRouteArgs) {
	const toLat = Number(args.toLat);
	const toLng = Number(args.toLng);
	const fromLat = args.fromLat == null ? null : Number(args.fromLat);
	const fromLng = args.fromLng == null ? null : Number(args.fromLng);
	const zoom = Number.isFinite(Number(args.zoom)) ? Number(args.zoom) : 16;

	if (!Number.isFinite(toLat) || !Number.isFinite(toLng)) return false;

	const to = `${toLng},${toLat}`;
	const from = Number.isFinite(fromLat as any) && Number.isFinite(fromLng as any) ? `${fromLng},${fromLat}` : null;

	const deepLinks: string[] = [];
	if (from) {
		deepLinks.push(`dgis://2gis.ru/routeSearch/rsType/car/from/${from}/to/${to}`);
		deepLinks.push(`2gis://2gis.ru/routeSearch/rsType/car/from/${from}/to/${to}`);
	}
	deepLinks.push(`dgis://2gis.ru/routeSearch/rsType/car/to/${to}`);
	deepLinks.push(`2gis://2gis.ru/routeSearch/rsType/car/to/${to}`);

	for (const url of deepLinks) {
		if (await tryOpen(url)) return true;
	}


	return open2GisPoint({ lat: toLat, lng: toLng, zoom });
}
