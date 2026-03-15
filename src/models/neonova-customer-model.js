class NeonovaCustomerModel {
    constructor(radiusUsername, friendlyName = '') {
        this.radiusUsername = radiusUsername.trim();
        this.friendlyName = (friendlyName.trim() || radiusUsername.trim());
        this.status = 'Connecting...';               
        this.durationSec = 0;                  
        this.lastUpdate = new Date().toLocaleString();
        this.lastEventTime = null
    }

    getDurationStr() {
      const seconds = this.durationSec || 0;
      let durationStr = '';
    
      if (seconds < 60) {
        durationStr = '<1min';
      } else {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
    
        if (days > 0) {
          durationStr += `${days}d `;
        }
        if (hours > 0) {
          durationStr += `${hours}h `;
        }
        durationStr += `${minutes}m`;
      }
    
      let timeStr = '';
      if (this.lastEventTime) {
        const eventDate = new Date(this.lastEventTime);
        if (!isNaN(eventDate.getTime())) {  // Check for valid Date
          timeStr = ` (${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})`;
        }
      }
    
      return `${durationStr}${timeStr}`;
    }

    update(status, durationSec) {
        this.status = status;
        this.durationSec = durationSec;
        this.lastUpdate = new Date().toLocaleString();
    }



    toJSON() {
        return {
            radiusUsername: this.radiusUsername,
            friendlyName: this.friendlyName,
            status: this.status,
            durationSec: this.durationSec,
            lastUpdate: this.lastUpdate
        };
    }
}
