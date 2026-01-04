export default function RecordButton({ onRecordStart, onRecordStop, isRecording }) {
  const handleClick = () => {
    if (isRecording) {
      onRecordStop()
    } else {
      onRecordStart()
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-center">
      <button
        onClick={handleClick}
        className={`
          w-20 h-20
          rounded-full
          touch-manipulation
          ${isRecording ? 'recording-circle' : 'record-circle'}
          transition-all duration-300 ease-out
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        disabled={false}
      >
        {isRecording ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-sm"></div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
        )}
      </button>
    </div>
  )
}
