// src/components/TrackList.jsx
import React from 'react';
import './TrackList.css';

const TrackList = ({ vinyl }) => {
  return (
    <div className="tracklist-container">
      <div className="vinyl-info">
        <h2>{vinyl.title}</h2>
        <h3>{vinyl.artist}</h3>
        <p>{vinyl.year}</p>
        {vinyl.label && <p>Label: {vinyl.label}</p>}
      </div>
      
      <div className="tracks">
        <h4>Tracks</h4>
        <ol>
          {vinyl.tracks.map((track, index) => (
            <li key={index}>
              <span className="track-title">{track.title}</span>
              {track.duration && <span className="track-duration">{track.duration}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default TrackList;
