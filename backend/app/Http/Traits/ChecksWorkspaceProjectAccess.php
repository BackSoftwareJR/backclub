<?php

namespace App\Http\Traits;

use App\Models\CrmProject;
use App\Models\CrmProjectTeamMember;

trait ChecksWorkspaceProjectAccess
{
    protected function getUserAccessibleProject(int $projectId): CrmProject
    {
        $user = auth()->user();
        $project = CrmProject::findOrFail($projectId);
        
        $isTeamMember = CrmProjectTeamMember::where('crm_project_id', $projectId)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();
        
        $isManager = $project->manager_id === $user->id;
        $isAdmin = $user->role === 'admin' || (method_exists($user, 'hasRole') && $user->hasRole('admin'));
        
        if (!$isTeamMember && !$isManager && !$isAdmin) {
            abort(403, 'Accesso non autorizzato al progetto');
        }
        
        return $project;
    }
    
    protected function isPmOrAdmin(CrmProject $project): bool
    {
        $user = auth()->user();
        return $project->manager_id === $user->id 
            || $user->role === 'admin'
            || (method_exists($user, 'hasRole') && $user->hasRole('admin'));
    }
}