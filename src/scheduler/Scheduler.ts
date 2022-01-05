import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import Log from "../Util";

export default class Scheduler implements IScheduler {

    private sections: SchedSection[];
    private rooms: SchedRoom[];
    private bestRoom: any;
    private maxDist: any;
    private maxSeats: any;
    private maxSize: any;
    private mapCourses: {[id: string]: number[]} = {};
    private totalSize: any;
    private times: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100",
                                "MWF 1100-1200", "MWF 1200-1300", "MWF 1300-1400",
                                "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700",
                                "TR  0800-0930", "TR  0930-1100", "TR  1100-1230",
                                "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];


    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        let result: Array<[SchedRoom, SchedSection, TimeSlot]> = [];
        this.initialize();
        this.sections = sections.slice(0);
        this.rooms = rooms.slice(0);

        this.sumSectionSize();
        this.sortSectionsDes();
        this.mapSections();

        this.findMaxDistSeats();
        this.findMaxSectionSize();
        this.calculateRooms();
        this.bestRoom = this.findBestRoom();

        this.distToBestRoom();
        this.sortRoomsScore();

        this.reCalculateRooms();
        this.sortRoomsScore();


        this.createTimeSlots();

        this.sections.forEach((section: any) => {
           this.findRoom(section);
        });

        this.produceResult(result);

        return result;
    }

    private initialize() {
        this.bestRoom = 0;
        this.maxDist = 0;
        this.maxSeats = 0;
        this.maxSize = 0;
        this.mapCourses = {};
        this.totalSize = 0;
    }

    private sortRoomsScore() {
        this.rooms.sort((a: any, b: any) => {
            if (a.score > b.score) {
                return -1;
            } else if (a.score < b.score) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    private reCalculateRooms() {
        let max = 0;
        this.rooms.forEach((room: any, index: number) => {
            if (index !== 0) {
                let size = room.rooms_seats / this.maxSeats;
                // room.score = 0.3 * size + ((1 - (room.dist / this.maxDist)) / 0.3);
                room.score = 0.2 * size + 0.7 * (1 - (room.dist / this.maxDist));
                max = room.score > max ? room.score : max;
            }
        });
        let first: any = this.rooms[0];
        first.score = max + 1;
    }

    private findMaxDistSeats() {
        let max: number = 0;
        let maxS: number = 0;
        this.rooms.forEach((roomA) => {
            maxS = maxS < roomA.rooms_seats ? roomA.rooms_seats : maxS;
            this.rooms.forEach((roomB) => {
                let dist = this.pointDistance(roomA.rooms_lat, roomB.rooms_lat, roomA.rooms_lon, roomB.rooms_lon);
                max = max < dist ? dist : max;
            });
        });
        this.maxDist = max;
        this.maxSeats = maxS;
    }

    private findMaxSectionSize() {
        let max: number = 0;
        this.sections.forEach((section: any) => {
            max = max < section.size ? section.size : max;
        });
        this.maxSize = max;
    }

    private produceResult(result: Array<[SchedRoom, SchedSection, TimeSlot]>) {
        this.rooms.forEach((room: any) => {
            let roomObj: SchedRoom = {
                rooms_shortname: room.rooms_shortname,
                rooms_number: room.rooms_number,
                rooms_seats: room.rooms_seats,
                rooms_lat: room.rooms_lat,
                rooms_lon: room.rooms_lon
            };

            room.timeSlots.forEach((timeSlot: any, index: number) => {
                if (timeSlot !== undefined && Object.keys(timeSlot).length !== 0) {
                    delete timeSlot["size"];
                    result.push([roomObj, timeSlot, this.times[index]]);
                }
            });
        });
    }

    private findRoom(section: any) {
        let rm: any;
        for (let room of this.rooms) {
            rm = room;
            if (rm.available && rm.rooms_seats >= section.size) {
                let index = 0;
                for (let slot of rm.timeSlots) {
                    let course: any = section.courses_dept.concat("_").concat(section.courses_id);
                    if (slot !== undefined && Object.keys(slot).length === 0 && !this.isConflict(course, index)) {
                        rm.timeSlots[index] = section;
                        rm.available = !(index === rm.timeSlots.length - 1);
                        return rm;
                    }
                    index++;
                }
            }
        }
    }

    private isConflict(course: any, time: number) {
        if (this.mapCourses[course].includes(time)) {
            return true;
        } else {
            this.mapCourses[course].push(time);
            return false;
        }
    }

    private mapSections() {
        this.sections.forEach((section) => {
           this.mapCourses[section.courses_dept.concat("_").concat(section.courses_id)] = [];
        });
    }

    private createTimeSlots() {
        this.rooms.forEach((room: any) => {
            room.timeSlots = new Array(15).fill({});
            room["available"] = true;
        });
    }

    // private sortRoomsDistToBest() {
    //     this.distToBestRoom();
    //     this.rooms.sort((a: any, b: any) => {
    //         if (a.dist > b.dist) {
    //             return 1;
    //         } else if (a.dist < b.dist) {
    //             return -1;
    //         } else {
    //             return 0;
    //         }
    //     });
    // }

    private distToBestRoom() {
        this.rooms.forEach((room: any) => {
            room["dist"] =
                this.pointDistance(room.rooms_lat, this.bestRoom.rooms_lat, room.rooms_lon, this.bestRoom.rooms_lon);
        });
    }

    // assumes calculateRooms has been called and is completed
    private findBestRoom() {
        let maxSoFar: any = this.rooms[0];
        this.rooms.forEach((room: any) => {
            if (room.score > maxSoFar.score) {
                maxSoFar = room;
            }
        });
        return maxSoFar;
    }

    private calculateRooms() {
        this.rooms.forEach((room, index) => {
            this.calculateRoomScore(room, index);
        });
    }

    private calculateRoomScore(room: any, index: number) {
        let score: number = 0;
        this.rooms.forEach((value: any) => {
           let dist = this.pointDistance(room.rooms_lat, value.rooms_lat, room.rooms_lon, value.rooms_lon);
           let size = value.rooms_seats;
           score += (size * this.sections.length / this.totalSize) * (1 - (dist / this.maxDist));
        });

        room["score"] = 0.2 * room.rooms_seats / this.maxSize + score / this.rooms.length;
    }


    // Source: https://www.movable-type.co.uk/scripts/latlong.html
    private pointDistance(lat1: number, lat2: number, lon1: number, lon2: number) {
        let R = 6371e3; // metres
        let a = lat1 * Math.PI / 180;
        let b = lat2 * Math.PI / 180;
        let c = (lat2 - lat1) * Math.PI / 180;
        let d = (lon2 - lon1) * Math.PI / 180;

        let e = Math.sin(c / 2) * Math.sin(c / 2) +
            Math.cos(a) * Math.cos(b) *
            Math.sin(d / 2) * Math.sin(d / 2);
        let f = 2 * Math.atan2(Math.sqrt(e), Math.sqrt(1 - e));

        return R * f;
    }

    // get sum of ppl in section = pass + fail + audio
    private sumSectionSize() {
        let sum = 0;
        this.sections.forEach((section: any) => {
            section["size"] = section.courses_pass + section.courses_fail + section.courses_audit;
            sum += section.courses_pass + section.courses_fail + section.courses_audit;
        });
        this.totalSize = sum;
    }

    // sort sections by size descending
    private sortSectionsDes() {
        this.sections.sort((a: any, b: any) => {
            if (a.size > b.size) {
                return -1;
            } else if (a.size < b.size) {
                return 1;
            } else {
                return 0;
            }
        });
    }
}
