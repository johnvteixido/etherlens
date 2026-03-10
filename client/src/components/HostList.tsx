import React, { useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';

// Mock data and types
type Host = {
  id: number;
  name: string;
  riskLevel: string;
  country: string;
  serviceCount: number;
};

const hostData: Host[] = []; // Fetch or generate your host data here

const HostList: React.FC = () => {
  const [filter, setFilter] = useState({ riskLevel: '', country: '' });
  const [sortedHosts, setSortedHosts] = useState<Host[]>([]);

  useEffect(() => {
    // Filter and sort logic here
    const filteredHosts = hostData.filter((host) =>
      (filter.riskLevel ? host.riskLevel === filter.riskLevel : true) &&
      (filter.country ? host.country === filter.country : true)
    );
    setSortedHosts(filteredHosts);
  }, [filter]);

  return (
    <div>
      <div>
        <select onChange={(e) => setFilter({ ...filter, riskLevel: e.target.value })}>
          <option value="">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select onChange={(e) => setFilter({ ...filter, country: e.target.value })}>
          <option value="">All Countries</option>
          {/* Add country options here */}
        </select>
      </div>
      <List
        height={500}
        itemCount={sortedHosts.length}
        itemSize={35}
        width={300}
      >
        {({ index, style }) => (
          <div style={style}>
            {sortedHosts[index].name} - {sortedHosts[index].riskLevel}
          </div>
        )}
      </List>
    </div>
  );
};

export default HostList;