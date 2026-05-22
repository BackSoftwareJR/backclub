@extends('emails.layouts.main')

@section('content')
    <h1>Benvenuto nel Progetto</h1>
    <p>Sei stato aggiunto al team del progetto <strong>{{ $project->name }}</strong>.</p>
    
    <table class="data-table">
        <tr>
            <td class="data-label">Progetto</td>
            <td class="data-value">{{ $project->name }}</td>
        </tr>
        <tr>
            <td class="data-label">Inizio</td>
            <td class="data-value">{{ \Carbon\Carbon::parse($project->start_date)->format('d/m/Y') }}</td>
        </tr>
    </table>

    @if($project->description)
        <p style="font-size: 14px; color: #86868b; margin-bottom: 5px;">Info</p>
        <p style="background-color: #f5f5f7; padding: 15px; border-radius: 12px; font-size: 14px;">
            {{ Str::limit($project->description, 150) }}
        </p>
    @endif

    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ config('app.url') }}/projects/{{ $project->id }}" class="button">Vai al Progetto</a>
    </div>
@endsection
