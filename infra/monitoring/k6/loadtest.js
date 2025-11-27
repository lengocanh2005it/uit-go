import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';

export let options = {
    vus: 50,
    duration: '2m',
};

const REQUESTS_PER_VU = 5;

function getRandomLatLng() {
    const lat = 10.75 + Math.random() * 0.02;
    const lng = 106.66 + Math.random() * 0.02;
    return { lat, lng };
}

export function setup() {
    const client = new grpc.Client();
    client.connect('kong:9000', { plaintext: true });
    return client;
}

export default function (client) {
    for (let i = 0; i < REQUESTS_PER_VU; i++) {
        const { lat, lng } = getRandomLatLng();
        const topN = 10;

        const response = client.invoke('driver.DriverService.FindAvailableDrivers', {
            lat,
            lng,
            topN,
        });

        check(response, {
            'status is OK': (r) => r.status === grpc.StatusOK,
            'has drivers': (r) => r.message && r.message.count >= 0,
        });

        sleep(1);
    }

}


export function teardown(client) {
    client.close();
}
