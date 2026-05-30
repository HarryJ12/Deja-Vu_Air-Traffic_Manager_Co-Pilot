import { useStore } from "../state/store";

export default function MeetingRoomButton() {
  const openMeetingRoom = useStore((s) => s.openMeetingRoom);
  return (
    <button className="ghost-btn" onClick={() => openMeetingRoom()}>
      Meeting Room
    </button>
  );
}
