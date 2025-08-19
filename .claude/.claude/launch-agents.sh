#!/bin/bash

echo "🤖 Launching Mech Services Multi-Agent System"
echo "=============================================="

# Function to launch agent in new terminal (macOS)
launch_agent() {
    local agent_name=$1
    local agent_role=$2
    local agent_file=$3
    
    echo "Launching $agent_name..."
    
    # Create the command to run in the new terminal
    local command="cd $(pwd) && echo '🤖 $agent_name Initialized' && echo 'Role: $agent_role' && echo 'Reading: $agent_file' && echo '' && echo 'Ready for coordination!' && bash"
    
    # Launch new terminal with the agent
    osascript <<END_SCRIPT
tell application "Terminal"
    do script "$command"
    set custom title of front window to "$agent_name"
end tell
END_SCRIPT
}

# Launch each agent in its own terminal
launch_agent "Security & Infrastructure Agent" "Security, credentials, infrastructure management" "agents/security-infrastructure-agent.md"
launch_agent "Service Deployment Agent" "Service building, deployment, orchestration" "agents/service-deployment-agent.md"
launch_agent "Quality & Validation Agent" "Testing, validation, monitoring" "agents/quality-validation-agent.md"
launch_agent "Documentation & Operations Agent" "Documentation, operations, knowledge management" "agents/documentation-operations-agent.md"

echo ""
echo "✅ All agents launched!"
echo ""
echo "Next Steps:"
echo "1. In each terminal, identify your agent role"
echo "2. Review your agent documentation"
echo "3. Check current status files"
echo "4. Begin coordinated operations"
echo ""
echo "Agent Communication:"
echo "- Update your status in respective status files"
echo "- Check MULTI_AGENT_COORDINATION.md for protocols"
echo "- Use shared documents for coordination"
